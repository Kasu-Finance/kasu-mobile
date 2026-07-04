import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { cardKeys } from '@/features/card';
import { KycWebView } from '@/features/kyc/kyc-webview';
import { useTheme } from '@/hooks/use-theme';
import { queryClient } from '@/lib/query/query-client';
import { useEthersSigner } from '@/lib/web3/use-ethers-signer';

/**
 * In-app identity verification for the card. Hosts the card partner's hosted
 * check in a full-screen WebView (our own header, no browser chrome — so the
 * flow's submit button is never covered, and it feels like part of the app).
 * Camera/liveness works via the WebView's granted media permission (see the
 * iOS NSCameraUsageDescription in app.json). Reached from the card flow with
 * the `url` param.
 */
export default function CardKycRoute() {
  const router = useRouter();
  const theme = useTheme();
  const { address } = useEthersSigner();
  const { url } = useLocalSearchParams<{ url?: string }>();
  const dismissedRef = useRef(false);

  const finish = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    if (address) {
      void queryClient.invalidateQueries({ queryKey: cardKeys.status(address) });
    } else {
      void queryClient.invalidateQueries({ queryKey: cardKeys.all });
    }
    if (router.canGoBack()) router.back();
    else router.replace('/card-details');
  }, [address, router]);

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.background }]}
      edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <ThemedText type="smallBold">Verify your identity</ThemedText>
        <Button title="Close" variant="ghost" onPress={finish} style={styles.close} />
      </View>
      {url ? (
        <KycWebView url={url} onComplete={finish} onCancel={finish} />
      ) : (
        <View style={styles.body}>
          <ThemedText type="small" themeColor="textSecondary">
            The verification link is unavailable. Please go back and try again.
          </ThemedText>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  close: { paddingHorizontal: 0 },
  body: { flex: 1, padding: 20 },
});
