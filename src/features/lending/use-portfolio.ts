import type { UserPositions } from '@kasufinance/kasu-sdk';
import { useQuery } from '@tanstack/react-query';

import { useSdk } from '@/lib/sdk/use-sdk';
import { useEthersSigner } from '@/lib/web3/use-ethers-signer';

import { lendingKeys } from './use-strategies';

/**
 * Reads the connected wallet's lending portfolio (per-pool positions +
 * aggregate summary) via the SDK facade. Disabled until both the SDK facade
 * and an address are ready.
 */
export function usePortfolio(addressOverride?: string | null) {
  const { kasu, chainId } = useSdk();
  const { address: walletAddress } = useEthersSigner();
  const address = addressOverride ?? walletAddress;

  return useQuery<UserPositions>({
    queryKey: lendingKeys.portfolio(chainId, address ?? ''),
    enabled: Boolean(kasu && address),
    queryFn: () => kasu!.portfolio.getPositions(address!),
    staleTime: 30 * 1000,
  });
}
