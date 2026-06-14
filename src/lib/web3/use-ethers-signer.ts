import { useEmbeddedEthereumWallet } from '@privy-io/expo';
import { ethers } from 'ethers';
import { useEffect, useState } from 'react';

/**
 * Builds an ethers v5 signer from the user's Privy embedded wallet.
 *
 * The embedded wallet's EIP-1193 provider (`wallet.getProvider()`) routes
 * `eth_sendTransaction` through Privy, which applies any configured gas-
 * sponsorship policy automatically — so no bespoke `SponsoredSigner` is needed
 * on Expo (unlike the web app). The Kasu SDK consumes this signer directly.
 */
export function useEthersSigner(): {
  signer: ethers.providers.JsonRpcSigner | null;
  address: string | null;
  ready: boolean;
} {
  const { wallets } = useEmbeddedEthereumWallet();
  const wallet = wallets[0];
  const address = wallet?.address ?? null;

  const [signer, setSigner] = useState<ethers.providers.JsonRpcSigner | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!wallet) {
      setSigner(null);
      setReady(false);
      return;
    }
    (async () => {
      try {
        const provider = await wallet.getProvider();
        if (cancelled) return;
        const web3 = new ethers.providers.Web3Provider(provider as never);
        setSigner(web3.getSigner(wallet.address));
      } catch (err) {
        console.error('useEthersSigner: failed to build signer', err);
        if (!cancelled) setSigner(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  return { signer, address, ready };
}
