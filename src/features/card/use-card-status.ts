import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';

import {
  cardKeys,
  isCardActive,
  toUiStatus,
  type CardBackendStatus,
  type CardStatusResponse,
  type CardStatusResult,
} from './types';

const VALID_BACKEND_STATUSES: ReadonlySet<CardBackendStatus> =
  new Set<CardBackendStatus>([
    'none',
    'session-required',
    'kyc-required',
    'kyc-pending',
    'blocked',
    'ready',
    'active',
  ]);

/**
 * Safe default: any unreachable/failed/unknown status degrades to "none" so a
 * backend hiccup never throws the Card tab into an error state — the user
 * just sees the onboarding CTA.
 */
const NONE_RESULT: CardStatusResult = {
  status: 'none',
  backendStatus: 'none',
  last4: null,
  balance: null,
  kycUrl: null,
  cards: [],
  activeCardId: null,
};

function normalizeBackendStatus(value: unknown): CardBackendStatus {
  return typeof value === 'string' &&
    VALID_BACKEND_STATUSES.has(value as CardBackendStatus)
    ? (value as CardBackendStatus)
    : 'none';
}

function last4FromMaskedPan(maskedPan?: string): string | null {
  const digits = (maskedPan ?? '').replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : null;
}

async function fetchCardStatus(userAddress: string): Promise<CardStatusResult> {
  try {
    const res = await api.get<Partial<CardStatusResponse>>('/mobile/card/status', {
      params: { userAddress: userAddress.toLowerCase() },
    });
    const data = res.data ?? {};
    const backendStatus = normalizeBackendStatus(data.status);
    const cards = data.cards ?? [];
    const activeCard = cards.find((c) => c.status === 'active') ?? null;
    return {
      status: toUiStatus(backendStatus),
      backendStatus,
      last4: last4FromMaskedPan(activeCard?.maskedPan),
      balance: data.balance ?? null,
      kycUrl: data.kycUrl ?? null,
      cards,
      activeCardId: activeCard?.id ?? null,
    };
  } catch (err) {
    // 501 (not implemented), timeout, network — all degrade to "none".
    console.warn('[card] status fetch failed; treating as none', err);
    return NONE_RESULT;
  }
}

/**
 * `useCardStatus(address?)` — the single source of truth for the Immersve
 * onboarding state machine (see `CardBackendStatus`). Disabled until an
 * address exists; errors are swallowed inside the fetcher so the query never
 * enters an error state. Polls while a step is settling out-of-band (KYC
 * review, activation block) and stops once the card is active.
 */
export function useCardStatus(address?: string | null) {
  const query = useQuery({
    queryKey: cardKeys.status(address ?? ''),
    queryFn: () => fetchCardStatus(address!),
    enabled: Boolean(address),
    staleTime: 30 * 1000,
    refetchInterval: (q) => {
      const s = q.state.data?.backendStatus;
      return s === 'kyc-pending' || s === 'blocked' || s === 'ready'
        ? 10 * 1000
        : false;
    },
  });

  const result = query.data;
  const status = result?.status ?? 'none';

  return {
    result,
    status,
    backendStatus: result?.backendStatus ?? 'none',
    last4: result?.last4 ?? null,
    balance: result?.balance ?? null,
    kycUrl: result?.kycUrl ?? null,
    activeCardId: result?.activeCardId ?? null,
    cards: result?.cards ?? [],
    isActive: isCardActive(status),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
