import type { Strategy, StrategyTranche } from '@kasufinance/kasu-sdk';
import { CHAIN_CONFIGS } from '@kasufinance/kasu-sdk';
import { useQueryClient } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { useCallback, useRef, useState } from 'react';

import { fetchKycAuthSignature } from '@/features/kyc';
import { useSdk } from '@/lib/sdk/use-sdk';
import { getChain } from '@/lib/web3/chains';
import { useEthersSigner } from '@/lib/web3/use-ethers-signer';

import { asContractType, type GenerateContractResponse } from './lib/contract-types';
import {
  CONTRACT_TTL_MS,
  DEPOSIT_STEP_ERRORS,
  type DepositStepId,
  fmt,
} from './lib/deposit-step-copy';
import { encodeDepositData } from './lib/encode-deposit-data';
import { isUnpredictableGas, isUserRejected } from './lib/errors';
import { fetchGenerateContract } from './lib/fetch-generate-contract';
import { lendingKeys } from './use-strategies';

/**
 * Ordered phases of the deposit pipeline. The UI renders a step badge + copy
 * keyed off the active phase; `error`/`success`/`declined` are terminal.
 */
export type DepositPhase =
  | 'idle'
  | 'generating-sign' // signing the auth message
  | 'generating-fetch' // POST /contract/generate
  | 'awaiting-accept' // loan contract shown, awaiting user
  | 'accepting-sign' // signing the contractMessage
  | 'approve' // ERC20 approve (exact amount) in flight
  | 'request-sign' // building KYC sig + submitting deposit tx
  | 'request-confirm' // waiting for the on-chain receipt
  | 'success'
  | 'declined' // user backed out of the loan contract
  | 'error';

/** Minimal ERC20 surface for the allowance pre-check + exact-amount approve. */
const ERC20_ALLOWANCE_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

export type DepositInput = {
  strategy: Strategy;
  tranche: StrategyTranche;
  /** Human amount (e.g. "1000.5"), in stable-asset display units. */
  amount: string;
  /** `'0'` for variable deposits, or the chosen fixed-term config id. */
  fixedTermConfigId?: string;
};

export type DepositState = {
  phase: DepositPhase;
  /** The generated loan contract, set once `generating-fetch` resolves. */
  contract: GenerateContractResponse | null;
  /** Step badge: 1-based index of the active inner step. */
  stepCurrent: number;
  /** Total inner steps (drops by one when approval is skipped). */
  stepTotal: number;
  errorStep: DepositStepId | null;
  errorMessage: string | null;
  /** Whether the ERC20 approve step is in scope for this run. */
  approvalRequired: boolean;
  isRunning: boolean;
};

const INITIAL: DepositState = {
  phase: 'idle',
  contract: null,
  stepCurrent: 0,
  stepTotal: 4,
  errorStep: null,
  errorMessage: null,
  approvalRequired: true,
  isRunning: false,
};

/** Resolve the LendingPoolManager (the ERC20 spender for deposits) for a chain. */
function lendingPoolManagerFor(chainId: number): string {
  const sdkChain = getChain(chainId).sdkChain;
  return CHAIN_CONFIGS[sdkChain].contracts.LendingPoolManager;
}

/** 1-based badge index for a step, accounting for a skipped approve. */
function stepIndex(step: DepositStepId, approvalRequired: boolean): number {
  const order: DepositStepId[] = approvalRequired
    ? ['generate', 'confirm', 'approve', 'request']
    : ['generate', 'confirm', 'request'];
  return order.indexOf(step) + 1;
}

/**
 * Multi-phase deposit state machine, ported from
 * `kasu-ui/src/features/lending/mutations/use-deposit-submit.ts`.
 *
 * Phases (study the web orchestrator):
 *  1. Form (caller) — amount + tranche; validated before `start()`.
 *  2. KYC gate (caller) — the screen wraps with `<KycGate>`.
 *  3. Generate — sign an auth message, POST `/contract/generate`.
 *  4. Accept — `acceptContract()` signs the returned `contractMessage`,
 *     encoded into `depositData`.
 *  5. Approve — exact-amount ERC20 allowance for the LendingPoolManager
 *     (NEVER unlimited; skipped when allowance already suffices).
 *  6. Deposit — build the KYC auth signature, then `kasu.deposits.deposit(...)`.
 *  7. Confirm — `success` phase; deposits clear at the next weekly epoch.
 *
 * The contract-accept handshake is a Promise bridge (the UI presents the
 * contract and the user taps Accept/Decline); a 5-min TTL guard re-routes an
 * idled contract to a regenerate instead of a doomed tx.
 */
export function useDeposit() {
  const { kasu, chainId } = useSdk();
  const { signer, address } = useEthersSigner();
  const queryClient = useQueryClient();

  const stable = getChain(chainId).stableAsset;
  const stableSymbol = stable.symbol;

  const [state, setState] = useState<DepositState>(INITIAL);

  // Promise bridge for the loan-contract accept handshake.
  const acceptRef = useRef<{
    resolve: (sig: string) => void;
    reject: (err: Error) => void;
  } | null>(null);

  const patch = useCallback((next: Partial<DepositState>) => {
    setState((prev) => ({ ...prev, ...next }));
  }, []);

  const reset = useCallback(() => {
    acceptRef.current = null;
    setState(INITIAL);
  }, []);

  /** Called by the UI when the user accepts the loan contract. */
  const acceptContract = useCallback(async () => {
    const bridge = acceptRef.current;
    if (!bridge || !signer || !state.contract) return;
    try {
      patch({ phase: 'accepting-sign' });
      const sig = await signer.signMessage(state.contract.contractMessage);
      bridge.resolve(sig);
    } catch (err) {
      bridge.reject(err as Error);
    }
  }, [patch, signer, state.contract]);

  /** Called by the UI when the user backs out of the loan contract. */
  const declineContract = useCallback(() => {
    acceptRef.current?.reject(
      Object.assign(new Error('contract-declined'), { reason: 'contract-declined' as const }),
    );
  }, []);

  const start = useCallback(
    async (input: DepositInput) => {
      if (!kasu || !signer || !address) {
        patch({
          phase: 'error',
          errorStep: 'generate',
          errorMessage: 'Wallet not ready. Please reconnect and try again.',
          isRunning: false,
        });
        return;
      }

      reset();
      acceptRef.current = null;

      const lower = address.toLowerCase();
      const amountNum = Number(input.amount);
      const requiredWei = ethers.utils.parseUnits(input.amount || '0', stable.decimals);
      const fixedTermConfigId = input.fixedTermConfigId ?? '0';

      // --- Allowance pre-check: decide if the approve step is in scope. ---
      const spender = lendingPoolManagerFor(chainId);
      const erc20 = new ethers.Contract(stable.address, ERC20_ALLOWANCE_ABI, signer);
      let approvalRequired = true;
      try {
        const allowance: ethers.BigNumber = await erc20.allowance(lower, spender);
        approvalRequired = allowance.lt(requiredWei);
      } catch {
        // Allowance read failed — assume an approve is needed (safe default).
        approvalRequired = true;
      }

      const stepTotal = approvalRequired ? 4 : 3;
      const badge = (step: DepositStepId) => ({
        stepCurrent: stepIndex(step, approvalRequired),
        stepTotal,
        approvalRequired,
      });

      // Callers resolve the cancelled-vs-failed copy (they hold the `cancelled`
      // flag), so `fail` just commits the terminal error state.
      const fail = (step: DepositStepId, message: string) => {
        patch({ phase: 'error', errorStep: step, errorMessage: message, isRunning: false });
      };

      try {
        // ---- Step 3: Generate — sign auth message ----
        patch({ phase: 'generating-sign', isRunning: true, ...badge('generate') });
        const tsMs = Date.now();
        const authMsg = `I request contract content for ${lower} at ${tsMs}.`;
        let authSig: string;
        try {
          authSig = await signer.signMessage(authMsg);
        } catch (err) {
          const cancelled = isUserRejected(err);
          fail(
            'generate',
            cancelled
              ? DEPOSIT_STEP_ERRORS.generate.cancelled
              : DEPOSIT_STEP_ERRORS.generate.failed,
          );
          return;
        }

        // ---- POST /contract/generate ----
        patch({ phase: 'generating-fetch', ...badge('generate') });
        let contract: GenerateContractResponse;
        try {
          contract = await fetchGenerateContract({
            address: lower,
            signature: authSig,
            timestamp: tsMs,
            depositAmount: amountNum,
            poolId: input.strategy.id,
          });
        } catch {
          // A backend failure here is never a wallet rejection — fixed copy.
          fail('generate', DEPOSIT_STEP_ERRORS.generate.failed);
          return;
        }

        // ---- Step 4: Accept — present the contract, await the signature ----
        const acceptedSig = await new Promise<string>((resolve, reject) => {
          acceptRef.current = { resolve, reject };
          patch({ phase: 'awaiting-accept', contract, ...badge('confirm') });
        });
        acceptRef.current = null;

        // 5-min TTL guard. An idled contract is regenerated rather than
        // submitted (the upstream signature would be stale).
        if (Date.now() > contract.timestamp + CONTRACT_TTL_MS) {
          patch({
            phase: 'error',
            errorStep: 'request',
            errorMessage: DEPOSIT_STEP_ERRORS.request.expired,
            isRunning: false,
          });
          return;
        }

        const depositData = encodeDepositData({
          signature: acceptedSig,
          timestamp: contract.timestamp,
          contractVersion: contract.contractVersion,
          contractType: asContractType(contract.contractType),
        });

        // ---- Step 5: Approve (exact amount, never unlimited) ----
        if (approvalRequired) {
          patch({ phase: 'approve', ...badge('approve') });
          try {
            // House rule: approve the EXACT required amount only.
            const tx: ethers.ContractTransaction = await erc20.approve(spender, requiredWei);
            await tx.wait();
          } catch (err) {
            const cancelled = isUserRejected(err);
            fail(
              'approve',
              fmt(
                cancelled
                  ? DEPOSIT_STEP_ERRORS.approve.cancelled
                  : DEPOSIT_STEP_ERRORS.approve.failed,
                stableSymbol,
              ),
            );
            return;
          }
        }

        // ---- Step 6: Deposit — KYC signature + on-chain deposit ----
        patch({ phase: 'request-sign', ...badge('request') });
        try {
          const kycParams = kasu.deposits.buildKycParams(lower as `0x${string}`);
          const { signature, blockExpiration } = await fetchKycAuthSignature(kycParams);

          const txResp = await kasu.deposits.deposit({
            poolId: input.strategy.id,
            trancheId: input.tranche.id,
            amount: requiredWei,
            kycSignature: { signature, blockExpiration },
            depositData,
            fixedTermConfigId,
          });

          patch({ phase: 'request-confirm', ...badge('request') });
          await txResp.wait();
        } catch (err) {
          const cancelled = isUserRejected(err);
          let message: string = cancelled
            ? DEPOSIT_STEP_ERRORS.request.cancelled
            : DEPOSIT_STEP_ERRORS.request.failed;
          // A revert here usually means the balance can't cover the deposit.
          if (isUnpredictableGas(err)) {
            message = fmt(DEPOSIT_STEP_ERRORS.request.insufficientBalance, stableSymbol);
          }
          fail('request', message);
          return;
        }

        // ---- Step 7: Confirm — success (clears at the next weekly epoch) ----
        patch({ phase: 'success', isRunning: false });

        // Refresh portfolio + strategies so the new position surfaces.
        void queryClient.invalidateQueries({ queryKey: lendingKeys.all });
      } catch (err) {
        // The only path that lands here is a rejected accept-handshake.
        const declined =
          err instanceof Error &&
          (err.message === 'contract-declined' ||
            (err as { reason?: string }).reason === 'contract-declined');
        if (declined) {
          acceptRef.current = null;
          patch({ phase: 'declined', isRunning: false });
          return;
        }
        const cancelled = isUserRejected(err);
        patch({
          phase: 'error',
          errorStep: 'confirm',
          errorMessage: cancelled
            ? DEPOSIT_STEP_ERRORS.confirm.cancelled
            : DEPOSIT_STEP_ERRORS.confirm.failed,
          isRunning: false,
        });
      }
    },
    [kasu, signer, address, chainId, stable, stableSymbol, patch, reset, queryClient],
  );

  return { state, start, acceptContract, declineContract, reset, stableSymbol };
}
