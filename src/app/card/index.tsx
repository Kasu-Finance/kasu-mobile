import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { CardOnboardWebView } from '@/features/card/card-onboard-webview';
import { useCardOnboard } from '@/features/card/use-card-onboard';
import { cardKeys } from '@/features/card/types';
import { useTheme } from '@/hooks/use-theme';
import { queryClient } from '@/lib/query/query-client';
import { useEthersSigner } from '@/lib/web3/use-ethers-signer';

/**
 * In-app WebView host for the Gnosis Pay card onboarding flow — an alternative
 * to the `expo-web-browser` path in `useCardOnboard.openOnboarding`. Reached via
 * `router.push('/card')`.
 *
 * It can receive a pre-minted `url` via search params, or mint one itself by
 * calling `POST /mobile/card/onboard`. On completion it invalidates the cached
 * status (so the Card tab refetches) and routes back.
 */
export default function CardOnboardRoute() {
  const router = useRouter();
  const theme = useTheme();
  const { address } = useEthersSigner();
  const params = useLocalSearchParams<{ url?: string }>();
  const onboard = useCardOnboard();

  const [url, setUrl] = useState<string | null>(params.url ?? null);
  const [error, setError] = useState<string | null>(null);
  // Guard against double-dismiss (completion + manual back racing).
  const dismissedRef = useRef(false);
  // Guard so we only auto-mint the URL once.
  const mintedRef = useRef(false);

  const goBack = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [router]);

  const handleComplete = useCallback(() => {
    if (address) {
      void queryClient.invalidateQueries({ queryKey: cardKeys.status(address) });
    } else {
      void queryClient.invalidateQueries({ queryKey: cardKeys.all });
    }
    goBack();
  }, [address, goBack]);

  // Auto-resolve the hosted KYC URL when none was passed in. The onboarding
  // ladder (SIWE handshake → contact → KYC) may need one advance step before
  // the status carries a kycUrl.
  useEffect(() => {
    if (url || mintedRef.current || !address) return;
    mintedRef.current = true;
    (async () => {
      try {
        const { api } = await import('@/lib/api/client');
        let status = (
          await api.get('/mobile/card/status', {
            params: { userAddress: address.toLowerCase() },
          })
        ).data as { status?: string; kycUrl?: string };
        if (status.status === 'session-required') {
          await onboard.advanceOnboarding({ userAddress: address });
          status = (
            await api.get('/mobile/card/status', {
              params: { userAddress: address.toLowerCase() },
            })
          ).data as { status?: string; kycUrl?: string };
        }
        setUrl(status.kycUrl || null);
        if (!status.kycUrl) setError('No KYC link was returned.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not start onboarding.');
      }
    })();
  }, [address, url, onboard]);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <ThemedText type="smallBold">Set up your card</ThemedText>
        <Button title="Close" variant="ghost" onPress={goBack} style={styles.close} />
      </View>

      {url ? (
        <CardOnboardWebView url={url} onComplete={handleComplete} onCancel={goBack} />
      ) : (
        <View style={styles.center}>
          {error ? (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          ) : (
            <ActivityIndicator color={theme.text} />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  error: { color: '#e4645a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  close: { height: 40, paddingHorizontal: 14 },
});
