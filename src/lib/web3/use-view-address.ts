import { useEthersSigner } from './use-ethers-signer';

/**
 * The address whose Kasu positions/balance the UI should display —
 * the logged-in Privy embedded wallet.
 */
export function useViewAddress(): {
  viewAddress: string | null;
  connectedAddress: string | null;
} {
  const { address } = useEthersSigner();
  return {
    viewAddress: address,
    connectedAddress: address,
  };
}
