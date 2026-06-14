/**
 * Copy strings + step ordering for the deposit pipeline. Ported from
 * `kasu-ui/src/features/lending/lib/deposit-step-copy.ts`.
 *
 * `{stableAsset}` is interpolated at consumer time to the chain's stable-asset
 * symbol (USDC, AUDD, …).
 */

export type DepositStepId = 'generate' | 'confirm' | 'approve' | 'request';

export const DEPOSIT_STEP_LABELS: Record<DepositStepId, string> = {
  generate: 'Generate loan contract',
  confirm: 'Sign loan contract',
  approve: 'Approve {stableAsset} spending',
  request: 'Submit deposit',
};

export const DEPOSIT_STEP_ERRORS = {
  generate: {
    failed: 'Unable to generate the loan contract. Please try again.',
    cancelled: 'Loan-contract generation was cancelled. Please try again.',
  },
  confirm: {
    failed: 'Unable to accept the loan contract. Please try again.',
    cancelled: 'Loan-contract signing was cancelled. Please sign again to continue.',
  },
  approve: {
    failed: '{stableAsset} approval failed. Please try again.',
    cancelled: '{stableAsset} approval was cancelled in your wallet. Please try again.',
  },
  request: {
    failed: 'Deposit request failed. Please try again.',
    cancelled: 'Deposit was cancelled in your wallet. Please try again.',
    expired: 'The loan contract has expired. Please generate a new contract to continue.',
    insufficientBalance: 'Insufficient {stableAsset} balance. Top up your wallet and try again.',
  },
} as const;

/** Substitute `{stableAsset}` with the chain's symbol (USDC, AUDD, …). */
export function fmt(template: string, stableAsset: string): string {
  return template.replace(/\{stableAsset\}/g, stableAsset);
}

/**
 * Generated loan contracts are valid for 5 minutes upstream. If the user idles
 * in the accept step past this window we regenerate rather than broadcast a
 * doomed tx.
 */
export const CONTRACT_TTL_MS = 5 * 60 * 1000;
