import { env } from '@/lib/env';

import { useEthersSigner } from './use-ethers-signer';

/**
 * The address whose Kasu positions/balance the UI should display.
 *
 * Defaults to the logged-in embedded wallet, but if `EXPO_PUBLIC_DEMO_PORTFOLIO_ADDRESS`
 * is set the app shows that address's real (read-only) positions — used for demo
 * builds so a fresh login still surfaces an actual lender portfolio.
 */
export function useViewAddress(): {
  viewAddress: string | null;
  connectedAddress: string | null;
  isDemo: boolean;
} {
  const { address } = useEthersSigner();
  const demo = env.demoPortfolioAddress || '';
  return {
    viewAddress: demo || address,
    connectedAddress: address,
    isDemo: Boolean(demo),
  };
}
