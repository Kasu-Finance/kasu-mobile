import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';

/**
 * Normalized KYC status returned by `GET /mobile/kyc/status`. Mirrors the
 * `KycResult` shape produced by `kasu-ui`'s `/api/kyc` route and the backend
 * `MobileKycStatusResponseDto` so the RN client reuses the same gating logic.
 *
 * `'Active'` is the only verified state. `'No status'` is the safe default when
 * the wallet has never started KYC — and the fallback we coerce errors into so
 * a 501/timeout from the (parallel) backend degrades gracefully to "not yet
 * verified, can retry".
 */
export type KycStatus =
  | 'Active'
  | 'Pending'
  | 'In Review'
  | 'Rejected'
  | 'Failed'
  | 'Terminated'
  | 'No Email'
  | 'No status';

export interface KycStatusResult {
  status: KycStatus;
  canRetry: boolean;
  email?: string | null;
}

/** Statuses that should let the user re-attempt verification. */
const RETRY_STATUSES: ReadonlySet<string> = new Set<KycStatus>([
  'Rejected',
  'Failed',
  'Terminated',
  'No status',
]);

/** True only when the wallet has a completed, approved KYC. */
export function isKycVerified(status: string): boolean {
  return status === 'Active';
}

/** Query-key factory so other features (e.g. lending) can invalidate. */
export const kycKeys = {
  all: ['mobile', 'kyc'] as const,
  status: (address: string) => ['mobile', 'kyc', 'status', address.toLowerCase()] as const,
};

/**
 * Safe default: treat any unreachable/failed status fetch as "no status".
 * The backend endpoints may still return HTTP 501 while a parallel agent
 * implements them — we never want that to throw the UI into an error state.
 */
const NO_STATUS: KycStatusResult = { status: 'No status', canRetry: true, email: null };

async function fetchKycStatus(userAddress: string): Promise<KycStatusResult> {
  try {
    const res = await api.get<Partial<KycStatusResult>>('/mobile/kyc/status', {
      params: { userAddress: userAddress.toLowerCase() },
    });
    const data = res.data ?? {};
    const status = (data.status as KycStatus | undefined) ?? 'No status';
    return {
      status,
      canRetry: data.canRetry ?? RETRY_STATUSES.has(status),
      email: data.email ?? null,
    };
  } catch (err) {
    // 501 (not implemented yet), timeout, network — all degrade to "no status".
    console.warn('[kyc] status fetch failed; treating as No status', err);
    return NO_STATUS;
  }
}

/**
 * `useKycStatus(address?)` — reads the wallet's KYC status. Disabled until an
 * address exists. Errors are swallowed inside `fetchKycStatus`, so the query
 * never enters an error state (always returns a usable result). Call `refetch`
 * after the verification flow completes to pick up the fresh status.
 */
export function useKycStatus(address?: string | null) {
  const query = useQuery({
    queryKey: kycKeys.status(address ?? ''),
    queryFn: () => fetchKycStatus(address!),
    enabled: Boolean(address),
    // The status changes out-of-band (in the Compilot widget), so keep it
    // fresh-ish and refetch on demand rather than trusting the 5-min default.
    staleTime: 30 * 1000,
  });

  const result = query.data;
  const status = result?.status ?? 'No status';

  return {
    result,
    status,
    email: result?.email ?? null,
    canRetry: result?.canRetry ?? true,
    isVerified: isKycVerified(status),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
