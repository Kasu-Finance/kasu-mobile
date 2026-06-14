/**
 * Best-effort detection of a user-rejected wallet action across ethers v5 /
 * Privy / EIP-1193 error shapes. Ported from `kasu-ui`'s `is-user-rejected.ts`
 * but trimmed to the shapes the Privy embedded wallet surfaces on Expo.
 */
export function isUserRejected(err: unknown): boolean {
  if (!err) return false;
  const e = err as {
    code?: number | string;
    message?: string;
    reason?: string;
    error?: { code?: number | string; message?: string };
  };
  // EIP-1193 user-rejected code.
  if (e.code === 4001 || e.code === 'ACTION_REJECTED') return true;
  if (e.error?.code === 4001) return true;
  const text = `${e.message ?? ''} ${e.reason ?? ''} ${e.error?.message ?? ''}`.toLowerCase();
  return (
    text.includes('user rejected') ||
    text.includes('user denied') ||
    text.includes('rejected the request') ||
    text.includes('request rejected') ||
    text.includes('declined')
  );
}

/** True when the wallet/RPC signalled the on-chain call would revert (commonly
 * an underlying `transferFrom` failing on insufficient balance/allowance). */
export function isUnpredictableGas(err: unknown): boolean {
  const e = err as { code?: string };
  return e?.code === 'UNPREDICTABLE_GAS_LIMIT';
}
