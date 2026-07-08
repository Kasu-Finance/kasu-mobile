import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TabHeader } from '@/components/ui/tab-header';

/**
 * Rewards tab (Plasma One-style): cashback earned on card spending + referrals.
 * Cashback accrual wires up with the card program (loyalty-tiered, paid weekly
 * alongside interest); until then this presents the real shape with zero
 * balances. Explanations live behind the "?".
 */
export default function RewardsScreen() {
  return (
    <Screen>
      <TabHeader />

      <Card style={styles.gap}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
          CASHBACK EARNED
        </ThemedText>
        <ThemedText type="title">$0.00</ThemedText>
      </Card>

      <Card style={styles.gap}>
        <ThemedText type="smallBold">Invite friends</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Referrals are coming soon.
        </ThemedText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 6 },
  label: { letterSpacing: 0.5 },
});
