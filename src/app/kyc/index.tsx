import { Stack, useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { KycWebView } from '@/features/kyc/kyc-webview';
import { kycKeys } from '@/features/kyc/use-kyc-status';
import { useTheme } from '@/hooks/use-theme';
import { queryClient } from '@/lib/query/query-client';
import { useEthersSigner } from '@/lib/web3/use-ethers-signer';

/**
 * Hosts the Compilot KYC WebView flow. Reached via `router.push('/kyc')` from
 * the gate / status screen. On completion it invalidates the cached status (so
 * the gate and status screen refetch the fresh result) and routes back.
 */
export default function KycRoute() {
  const router = useRouter();
  const theme = useTheme();
  const { address } = useEthersSigner();
  // Guard against double-dismiss (completion + manual back racing).
  const dismissedRef = useRef(false);

  const goBack = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/profile');
  }, [router]);

  const handleComplete = useCallback(() => {
    // Invalidate so any mounted `useKycStatus(address)` refetches the
    // authoritative status — a completion URL means "widget closed", not
    // necessarily "verified".
    if (address) {
      void queryClient.invalidateQueries({ queryKey: kycKeys.status(address) });
    } else {
      void queryClient.invalidateQueries({ queryKey: kycKeys.all });
    }
    goBack();
  }, [address, goBack]);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <ThemedText type="smallBold">Verify your identity</ThemedText>
        <Button title="Close" variant="ghost" onPress={goBack} style={styles.close} />
      </View>
      <KycWebView onComplete={handleComplete} onCancel={goBack} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  close: { height: 40, paddingHorizontal: 14 },
});
