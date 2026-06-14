import type { Strategy } from '@kasufinance/kasu-sdk';
import { useQuery } from '@tanstack/react-query';

import { useSdk } from '@/lib/sdk/use-sdk';

/** Query keys for lending data so other hooks/screens can invalidate. */
export const lendingKeys = {
  all: ['lending'] as const,
  strategies: (chainId: number) => ['lending', 'strategies', chainId] as const,
  strategy: (chainId: number, poolId: string) => ['lending', 'strategy', chainId, poolId] as const,
  portfolio: (chainId: number, address: string) =>
    ['lending', 'portfolio', chainId, address.toLowerCase()] as const,
  history: (chainId: number, address: string) =>
    ['lending', 'history', chainId, address.toLowerCase()] as const,
};

/**
 * Lists all active lending strategies via the SDK facade. Disabled until the
 * wallet/signer is ready (the facade is `null` before then).
 */
export function useStrategies() {
  const { kasu, chainId } = useSdk();
  return useQuery<Strategy[]>({
    queryKey: lendingKeys.strategies(chainId),
    enabled: Boolean(kasu),
    queryFn: () => kasu!.strategies.getAll(),
    staleTime: 60 * 1000,
  });
}

/** Fetches a single strategy by pool id. Returns `null` when not found. */
export function useStrategy(poolId: string | undefined) {
  const { kasu, chainId } = useSdk();
  return useQuery<Strategy | null>({
    queryKey: lendingKeys.strategy(chainId, poolId ?? ''),
    enabled: Boolean(kasu && poolId),
    queryFn: () => kasu!.strategies.getById(poolId!),
    staleTime: 60 * 1000,
  });
}
