import { PrivyProvider as PrivyRootProvider } from '@privy-io/expo';
import { QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { base, xdc } from 'viem/chains';

import { env } from '@/lib/env';
import { queryClient } from '@/lib/query/query-client';

/**
 * Root Privy + TanStack Query provider for the mobile app.
 *
 * Shares the SAME Privy app as `kasu-ui`, so a user's embedded wallet, KYC and
 * positions are identical across web and mobile. Embedded wallets are created
 * for users-without-wallets on login (email / Google / SIWE handled per-screen
 * via Privy hooks). Gas sponsorship on Base is a Privy dashboard policy — no
 * custom signer needed on Expo.
 *
 * Requires `EXPO_PUBLIC_PRIVY_APP_ID` (and client id) to be set — bundling
 * still works without them, but the app needs them at runtime to log in.
 */
export function AppProviders({ children }: PropsWithChildren) {
  if (__DEV__ && !env.privyAppId) {
    console.warn('[kasu] EXPO_PUBLIC_PRIVY_APP_ID is not set — login will fail.');
  }

  return (
    <PrivyRootProvider
      appId={env.privyAppId}
      clientId={env.privyClientId || undefined}
      supportedChains={[base, xdc]}
      config={{
        embedded: {
          ethereum: { createOnLogin: 'users-without-wallets' },
        },
      }}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </PrivyRootProvider>
  );
}
