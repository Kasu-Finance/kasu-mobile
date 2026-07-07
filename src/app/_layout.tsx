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
import { usePrivy } from '@privy-io/expo';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';

import { Colors } from '@/constants/theme';
import { useCardStatus, useEnsureCardSession } from '@/features/card';
import { NotificationsProvider } from '@/features/notifications/notifications-provider';
import { useNotificationPrefs } from '@/features/notifications/use-notification-prefs';
import { useRegisterPush } from '@/features/notifications/use-register-push';
import { SdkProvider } from '@/lib/sdk/sdk-provider';
import { AppProviders } from '@/lib/web3/privy-provider';
import { DEFAULT_CHAIN_ID } from '@/lib/web3/chains';
import { useStableBalance } from '@/lib/web3/use-balance';
import { useEthersSigner } from '@/lib/web3/use-ethers-signer';

SplashScreen.preventAutoHideAsync();

/** Never hold the splash longer than this, even if a fetch is slow. */
const SPLASH_MAX_MS = 3500;

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

/** Registers the device's Expo push token once a wallet address is available (F5),
 *  unless the user has turned the master notifications toggle off. */
function PushRegistrar() {
  const { address } = useEthersSigner();
  const { prefs } = useNotificationPrefs();
  useRegisterPush(address, prefs.enabled);
  return null;
}

/**
 * Warms the essential data behind the splash so Home renders with numbers
 * already in place (no 1s pop-in): the wallet balance and the card status,
 * and it pre-establishes the (in-memory) card session so an existing card
 * shows immediately. Signals `onReady` once loaded, when not logged in, or on
 * a safety timeout.
 */
function Preloader({ onReady }: { onReady: () => void }) {
  const { user, isReady } = usePrivy();
  const { address } = useEthersSigner();
  const balance = useStableBalance(address, DEFAULT_CHAIN_ID);
  const card = useCardStatus(address);
  useEnsureCardSession(address, card.backendStatus);
  const doneRef = useRef(false);

  const notLoggedIn = isReady && !user;
  const dataLoaded = Boolean(address) && !balance.isLoading && !card.isLoading;
  const ready = notLoggedIn || dataLoaded;

  const reveal = () => {
    if (!doneRef.current) {
      doneRef.current = true;
      onReady();
    }
  };

  useEffect(() => {
    if (ready) reveal();
  });

  useEffect(() => {
    const t = setTimeout(reveal, SPLASH_MAX_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

/**
 * Root layout: Privy + TanStack Query providers, theme, the Kasu SDK provider,
 * notifications, and the route stack. Dark-only; gates first render on the
 * bundled brand fonts, and holds the splash until the essential data is warm.
 *
 * `SdkProvider` lives HERE (not in `(tabs)/_layout`) so root-level routes
 * (`/lending/[poolId]`, `/bank`, `/card`, `/kyc`) get the SDK too.
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
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    if (fontsLoaded && dataReady) SplashScreen.hideAsync();
  }, [fontsLoaded, dataReady]);

  if (!fontsLoaded) return null;

  return (
    <AppProviders>
      <ThemeProvider value={KasuNavTheme}>
        <SdkProvider chainId={DEFAULT_CHAIN_ID}>
          <NotificationsProvider>
            <PushRegistrar />
            <Preloader onReady={() => setDataReady(true)} />
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
