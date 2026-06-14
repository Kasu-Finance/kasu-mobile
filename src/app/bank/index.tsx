import { Stack, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DEMO_LINKED_BANK } from '@/features/onramp/demo-bank';
import { ReadOnlyField } from '@/features/onramp/sheet';
import { useTheme } from '@/hooks/use-theme';

/**
 * "My bank" — shows the single bootstrapped (stub) linked bank account in
 * read-only fields. Reached from Home → Accounts.
 *
 * TODO: wire Wayex — replace `DEMO_LINKED_BANK` with `GET /wayex/bank-accounts`
 * once a backend session exists.
 */
export default function MyBankRoute() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.title}>
          My bank
        </ThemedText>
        <Button
          title="Close"
          variant="ghost"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={styles.close}
        />
      </View>

      <View style={styles.body}>
        <ThemedText type="small" themeColor="textSecondary">
          Linked bank account
        </ThemedText>
        <Card style={styles.card}>
          <ReadOnlyField label="Account holder" value={DEMO_LINKED_BANK.accountHolder} />
          <ReadOnlyField label="Bank name" value={DEMO_LINKED_BANK.bankName} />
          <ReadOnlyField label="IBAN" value={DEMO_LINKED_BANK.iban} />
          <ReadOnlyField label="BIC" value={DEMO_LINKED_BANK.bic} />
        </Card>
        <ThemedText type="small" themeColor="textSecondary">
          Demo account — read only. Adding or editing banks requires a verified
          Wayex session.
        </ThemedText>
      </View>
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
  },
  title: { fontSize: 28, lineHeight: 34 },
  close: { height: 40, paddingHorizontal: 14 },
  body: { padding: 20, gap: 12 },
  card: { gap: 12 },
});
