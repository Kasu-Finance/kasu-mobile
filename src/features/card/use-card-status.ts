import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';

import {
  cardKeys,
  isCardActive,
  type CardStatus,
  type CardStatusResponse,
  type CardStatusResult,
} from './types';

const VALID_STATUSES: ReadonlySet<CardStatus> = new Set<CardStatus>([
  'none',
  'pending',
  'active',
  'frozen',
  'rejected',
]);

/**
 * Safe default: any unreachable/failed/unknown status degrades to "none" so a
 * 501 (backend still being built) or a timeout never throws the Card tab into
 * an error state — the user just sees the onboarding CTA.
 */
const NONE_RESULT: CardStatusResult = { status: 'none', last4: null };

function normalizeStatus(value: unknown): CardStatus {
  return typeof value === 'string' && VALID_STATUSES.has(value as CardStatus)
    ? (value as CardStatus)
    : 'none';
}

async function fetchCardStatus(userAddress: string): Promise<CardStatusResult> {
  try {
    const res = await api.get<Partial<CardStatusResponse>>('/mobile/card/status', {
      params: { userAddress: userAddress.toLowerCase() },
    });
    const data = res.data ?? {};
    return {
      status: normalizeStatus(data.status),
      last4: data.last4 ?? null,
    };
  } catch (err) {
    // 501 (not implemented), timeout, network — all degrade to "none".
    console.warn('[card] status fetch failed; treating as none', err);
    return NONE_RESULT;
  }
}

/**
 * `useCardStatus(address?)` — reads the wallet's Gnosis Pay card status.
 * Disabled until an address exists. Errors are swallowed inside the fetcher, so
 * the query never enters an error state. The status changes out-of-band (the
 * user completes the hosted Gnosis Pay flow in a browser), so it's kept
 * fresh-ish and refetched on demand after onboarding/top-up.
 */
export function useCardStatus(address?: string | null) {
  const query = useQuery({
    queryKey: cardKeys.status(address ?? ''),
    queryFn: () => fetchCardStatus(address!),
    enabled: Boolean(address),
    staleTime: 30 * 1000,
  });

  const result = query.data;
  const status = result?.status ?? 'none';

  return {
    result,
    status,
    last4: result?.last4 ?? null,
    isActive: isCardActive(status),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
