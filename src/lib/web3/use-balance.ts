import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';

import { getChain } from './chains';

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];

/**
 * Reads the stable-asset (USDC) balance for an address on a chain via a public
 * RPC — independent of the SDK so the Home screen works before any deposit.
 */
export function useStableBalance(address: string | null, chainId: number) {
  const chain = getChain(chainId);
  return useQuery({
    queryKey: ['stable-balance', chainId, address?.toLowerCase()],
    enabled: !!address,
    queryFn: async () => {
      const provider = new ethers.providers.JsonRpcProvider(chain.rpcUrl, chainId);
      const erc20 = new ethers.Contract(chain.stableAsset.address, ERC20_ABI, provider);
      const raw: ethers.BigNumber = await erc20.balanceOf(address);
      return raw.toString();
    },
  });
}
