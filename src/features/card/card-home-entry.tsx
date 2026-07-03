import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';

import { useCardStatus } from './use-card-status';

/**
 * Home entry point for the card. Reflects the card state in a bank-style
 * prompt and routes into the card management screen — the card flow is never
 * shown as "crypto onboarding".
 */
export function CardHomeEntry({ address }: { address: string | null | undefined }) {
  const theme = useTheme();
  const router = useRouter();
  const { backendStatus, isActive } = useCardStatus(address);

  if (!address) return null;

  const go = () => router.push('/card-details');

  if (isActive) {
    return (
      <Card style={styles.row}>
        <View style={styles.rowText}>
          <ThemedText type="smallBold">Your Kasu card</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            View your number, top up and manage.
          </ThemedText>
        </View>
        <Button title="Manage" variant="secondary" onPress={go} style={styles.cta} />
      </Card>
    );
  }

  const copy =
    backendStatus === 'kyc-required'
      ? {
          title: 'Verify your identity',
          body: 'One quick check and your card is ready.',
          cta: 'Verify',
        }
      : backendStatus === 'kyc-pending' || backendStatus === 'blocked'
        ? {
            title: 'Verification in progress',
            body: 'We’re confirming your details.',
            cta: 'View',
          }
        : backendStatus === 'ready'
          ? {
              title: 'Your card is ready',
              body: 'Create it to start spending.',
              cta: 'Create',
            }
          : {
              title: 'Get the Kasu card',
              body: 'Spend your balance anywhere Mastercard is accepted, with cashback.',
              cta: 'Set up',
            };

  return (
    <Card style={[styles.pitch, { borderColor: theme.primary }]}>
      <ThemedText type="smallBold">{copy.title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {copy.body}
      </ThemedText>
      <Button title={copy.cta} onPress={go} />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowText: { flex: 1, gap: 2 },
  cta: { paddingHorizontal: 20 },
  pitch: { gap: 8, borderWidth: 1 },
});
