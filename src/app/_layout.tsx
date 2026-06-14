import {
  CrimsonText_400Regular,
  CrimsonText_600SemiBold,
} from '@expo-google-fonts/crimson-text';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';
import { NotificationsProvider } from '@/features/notifications/notifications-provider';
import { useRegisterPush } from '@/features/notifications/use-register-push';
import { SdkProvider } from '@/lib/sdk/sdk-provider';
import { AppProviders } from '@/lib/web3/privy-provider';
import { DEFAULT_CHAIN_ID } from '@/lib/web3/chains';
import { useEthersSigner } from '@/lib/web3/use-ethers-signer';

SplashScreen.preventAutoHideAsync();

/** Kasu brand dark theme for the navigation container (status bar, headers, bg). */
const KasuNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.dark.background,
    card: Colors.dark.background,
    text: Colors.dark.text,
    border: Colors.dark.border,
    primary: Colors.dark.primary,
  },
};

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
 * The app is **dark-only** (Kasu brand) and gates first render on the bundled
 * brand fonts (DM Sans + Crimson Text) so headings never flash a system font.
 *
 * `SdkProvider` lives HERE (not in `(tabs)/_layout`) so that root-level routes
 * outside the tab group — `/lending/[poolId]`, `/bank`, `/card`, `/kyc` — also
 * get the SDK context. Otherwise `useSdk()` returns `null` there and data never
 * loads (this caused "Strategy not found" on the detail screen).
 */
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    CrimsonText_400Regular,
    CrimsonText_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AppProviders>
      <ThemeProvider value={KasuNavTheme}>
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
        <StatusBar style="light" />
      </ThemeProvider>
    </AppProviders>
  );
}
