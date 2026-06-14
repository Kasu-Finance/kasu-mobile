import { useRouter } from 'expo-router';
import { useEffect, useRef, type PropsWithChildren, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useEthersSigner } from '@/lib/web3/use-ethers-signer';

import { useKycStatus } from './use-kyc-status';

export interface KycGateProps {
  /**
   * Override the gated wallet address. Defaults to the embedded-wallet address.
   */
  address?: string | null;
  /** Optional custom prompt copy shown when the user isn't verified. */
  prompt?: string;
  /** Optional node rendered while the first status fetch is in flight. */
  fallback?: ReactNode;
}

/**
 * Gates `children` behind a verified KYC status. When verified, renders the
 * children unchanged. Otherwise shows a minimal "Verify your identity" card
 * with a CTA that pushes the `/kyc` route. On returning from that route this
 * component refetches the status, so a freshly-verified user sees the gated
 * content without a manual reload.
 *
 * Used by the lending feature (F2) to wrap the deposit form.
 */
export function KycGate({
  children,
  address,
  prompt = 'You need to verify your identity before you can continue.',
  fallback,
}: PropsWithChildren<KycGateProps>) {
  const router = useRouter();
  const { address: walletAddress } = useEthersSigner();
  const effectiveAddress = address ?? walletAddress;

  const { isVerified, isLoading, refetch } = useKycStatus(effectiveAddress);

  // Refetch whenever this component regains focus (e.g. after popping back from
  // the `/kyc` route). `expo-router` re-mounts/re-focuses screens, but a gate
  // embedded mid-screen won't re-mount — so we also expose `refetch` to the
  // route's completion handler. As a belt-and-braces measure, refetch on every
  // mount of a not-yet-verified gate.
  const didMountRef = useRef(false);
  useEffect(() => {
    if (didMountRef.current) return;
    didMountRef.current = true;
    if (effectiveAddress && !isVerified) {
      void refetch();
    }
  }, [effectiveAddress, isVerified, refetch]);

  if (isVerified) return <>{children}</>;

  if (isLoading) {
    return (
      fallback ?? (
        <View style={styles.loading}>
          <ActivityIndicator />
        </View>
      )
    );
  }

  return (
    <Card style={styles.card}>
      <ThemedText type="smallBold">Verify your identity</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {prompt}
      </ThemedText>
      <Button
        title="Verify identity"
        onPress={() => {
          // Navigate to the KYC flow, then refresh status on return.
          router.push('/kyc');
          // The route refetches on completion; this covers the back-swipe case
          // where `onComplete` never fired but status may have changed.
          void refetch();
        }}
        style={styles.cta}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  cta: { marginTop: 4 },
  loading: { paddingVertical: 24, alignItems: 'center' },
});
