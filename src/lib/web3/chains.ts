import type { SupportedChain } from '@kasufinance/kasu-sdk';

/**
 * Mobile chain registry. `sdkChain` maps to the Kasu SDK facade chain key;
 * `stableAsset` is the deposit/payment token used across lend + payments.
 *
 * XDC RPC intentionally uses primenumbers — never `rpc.xdc.org` (house rule).
 */
export interface ChainEntry {
  id: number;
  name: string;
  sdkChain: SupportedChain;
  rpcUrl: string;
  /** Whether Privy gas sponsorship is expected (dashboard policy) on this chain. */
  sponsorsGas: boolean;
  stableAsset: {
    symbol: string;
    address: string;
    decimals: number;
  };
}

export const CHAINS: Record<number, ChainEntry> = {
  8453: {
    id: 8453,
    name: 'Base',
    sdkChain: 'base',
    // Read from env (set to a dedicated Tenderly/Alchemy gateway). The public
    // mainnet.base.org fallback is rate-limited and makes the SDK's per-tranche
    // on-chain reads (getPositions) take minutes — fine as a fallback only.
    rpcUrl: process.env.EXPO_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org',
    sponsorsGas: true,
    stableAsset: {
      symbol: 'USDC',
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      decimals: 6,
    },
  },
  50: {
    id: 50,
    name: 'XDC',
    sdkChain: 'xdc-usdc',
    rpcUrl: 'https://rpc.primenumbers.xyz/',
    sponsorsGas: false,
    stableAsset: {
      symbol: 'USDC',
      address: '0x83a3ebc78f4e7f9c5e6f8d9b3a5f0a0d3e4f5a6b', // TODO: confirm XDC USDC address from SDK config
      decimals: 6,
    },
  },
};

export const DEFAULT_CHAIN_ID = 8453;

export function getChain(chainId: number): ChainEntry {
  return CHAINS[chainId] ?? CHAINS[DEFAULT_CHAIN_ID];
}
