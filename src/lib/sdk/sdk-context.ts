import type { Kasu } from '@kasufinance/kasu-sdk';
import { createContext } from 'react';

export interface SdkContextValue {
  /** Authenticated Kasu facade (null until an embedded-wallet signer exists). */
  kasu: Kasu | null;
  /** Current chain id the SDK is bound to. */
  chainId: number;
}

export const SdkContext = createContext<SdkContextValue>({ kasu: null, chainId: 0 });
