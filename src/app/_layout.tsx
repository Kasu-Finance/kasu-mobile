import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { NotificationsProvider } from '@/features/notifications/notifications-provider';
import { useRegisterPush } from '@/features/notifications/use-register-push';
import { SdkProvider } from '@/lib/sdk/sdk-provider';
import { AppProviders } from '@/lib/web3/privy-provider';
import { DEFAULT_CHAIN_ID } from '@/lib/web3/chains';
import { useEthersSigner } from '@/lib/web3/use-ethers-signer';

/** Registers the device's Expo push token once a wallet address is available (F5). */
function PushRegistrar() {
  const { address } = useEthersSigner();
  useRegisterPush(address);
  return null;
}

/**
 * Root layout: Privy + TanStack Query providers, theme, the Kasu SDK provider,
 * notifications, and the route stack.
 *
 * `SdkProvider` lives HERE (not in `(tabs)/_layout`) so that root-level routes
 * outside the tab group — `/lending/[poolId]`, `/bank`, `/card`, `/kyc` — also
 * get the SDK context. Otherwise `useSdk()` returns `null` there and data never
 * loads (this caused "Strategy not found" on the detail screen).
 */
export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <AppProviders>
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SdkProvider chainId={DEFAULT_CHAIN_ID}>
          <NotificationsProvider>
            <PushRegistrar />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
            </Stack>
          </NotificationsProvider>
        </SdkProvider>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AppProviders>
  );
}
