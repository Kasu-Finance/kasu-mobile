import { Kasu } from '@kasufinance/kasu-sdk';
import { ethers } from 'ethers';
import { type PropsWithChildren, useEffect, useMemo, useState } from 'react';

import { getChain } from '@/lib/web3/chains';
import { useEthersSigner } from '@/lib/web3/use-ethers-signer';

import { SdkContext } from './sdk-context';

/**
 * Config overrides applied to every Kasu instance.
 *
 * The Kasu subgraph treats `id_not_in: []` as "match nothing", so the SDK's
 * built-in `unusedPoolIds: []` returns ZERO pools (and therefore an empty
 * portfolio — even for logged-in users). Passing a non-empty sentinel makes all
 * real pools load. `poolMetadataMapping` must be an object — the SDK indexes
 * into it while building the pool overview and the built-in config leaves it
 * undefined (which throws once pools are present).
 */
const SDK_CONFIG_OVERRIDES = {
  UNUSED_LENDING_POOL_IDS: ['0x0000000000000000000000000000000000000000'],
  poolMetadataMapping: {},
};

/**
 * Builds the `Kasu` facade and exposes it via `useSdk()`. Uses the embedded-
 * wallet signer when available (for deposits/withdrawals); otherwise a read-only
 * RPC provider so strategies + portfolio load before/without login (demo mode).
 */
export function SdkProvider({
  chainId,
  children,
}: PropsWithChildren<{ chainId: number }>) {
  const { signer } = useEthersSigner();
  const [kasu, setKasu] = useState<Kasu | null>(null);

  useEffect(() => {
    let cancelled = false;
    try {
      const chain = getChain(chainId);
      const signerOrProvider =
        signer ?? new ethers.providers.JsonRpcProvider(chain.rpcUrl, chainId);
      const instance = Kasu.create({
        chain: chain.sdkChain,
        signerOrProvider,
        configOverrides: SDK_CONFIG_OVERRIDES,
      });
      if (!cancelled) setKasu(instance);
    } catch (err) {
      console.error('SdkProvider: failed to create Kasu SDK', err);
      if (!cancelled) setKasu(null);
    }
    return () => {
      cancelled = true;
    };
  }, [signer, chainId]);

  const value = useMemo(() => ({ kasu, chainId }), [kasu, chainId]);

  return <SdkContext.Provider value={value}>{children}</SdkContext.Provider>;
}
