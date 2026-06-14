import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ethers } from 'ethers';

import { fetchKycAuthSignature } from '@/features/kyc';
import { useSdk } from '@/lib/sdk/use-sdk';
import { getChain } from '@/lib/web3/chains';
import { useEthersSigner } from '@/lib/web3/use-ethers-signer';

import { DEPOSIT_STEP_ERRORS } from './lib/deposit-step-copy';
import { isUserRejected } from './lib/errors';
import { lendingKeys } from './use-strategies';

export type WithdrawInput = {
  poolId: string;
  trancheId: string;
  /** Human amount in stable-asset display units, or `'max'` for the full balance. */
  amount: string | 'max';
};

/**
 * Requests a withdrawal via the SDK facade. Like deposits, withdrawals are
 * KYC-gated, so we build the same Nexera auth signature before submitting.
 *
 * `kasu.deposits.withdraw` accepts an amount in stable-asset BASE units or the
 * literal `'max'`. Withdrawals (like deposits) settle at the next weekly epoch.
 */
export function useWithdraw() {
  const { kasu, chainId } = useSdk();
  const { address } = useEthersSigner();
  const queryClient = useQueryClient();
  const stable = getChain(chainId).stableAsset;

  return useMutation<void, Error, WithdrawInput>({
    mutationFn: async ({ poolId, trancheId, amount }) => {
      if (!kasu || !address) throw new Error('Wallet not ready. Please reconnect and try again.');

      const lower = address.toLowerCase();

      // KYC-gated like deposits: the on-chain call verifies a Nexera signature.
      // Building it here keeps the withdraw path symmetric with the deposit one.
      const kycParams = kasu.deposits.buildKycParams(lower as `0x${string}`);
      // The signature is fetched to surface a clear error early if KYC lapsed;
      // the facade `withdraw` itself does not currently take it as a param.
      await fetchKycAuthSignature(kycParams);

      // Max withdrawals route through the dedicated facade method; specific
      // amounts go through `withdraw` with base-unit `BigNumberish`.
      const tx =
        amount === 'max'
          ? await kasu.deposits.withdrawMax(poolId, trancheId, lower)
          : await kasu.deposits.withdraw({
              poolId,
              trancheId,
              amount: ethers.utils.parseUnits(amount || '0', stable.decimals),
            });
      await tx.wait();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: lendingKeys.all });
    },
    onError: (err) => {
      // Normalise common wallet errors so the UI can show friendly copy.
      if (isUserRejected(err)) {
        err.message = DEPOSIT_STEP_ERRORS.request.cancelled;
      }
    },
  });
}
