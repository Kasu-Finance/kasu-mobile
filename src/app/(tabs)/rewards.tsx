import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TabHeader } from '@/components/ui/tab-header';

/** Rewards explanations — behind the "?". */
const REWARDS_HELP = {
  title: 'Rewards',
  items: [
    {
      heading: 'Cashback',
      body: 'Earn cashback on every card purchase. Rewards land every Thursday, together with your weekly interest.',
    },
    {
      heading: 'Reward tiers',
      body: 'Higher tiers unlock bigger cashback and larger weekly top-ups to your card.',
    },
    {
      heading: 'Invite friends',
      body: 'Referrals are coming soon — invite friends and earn a share of their rewards.',
    },
  ],
};

/**
 * Rewards tab (Plasma One-style): cashback earned on card spending + referrals.
 * Cashback accrual wires up with the card program (loyalty-tiered, paid weekly
 * alongside interest); until then this presents the real shape with zero
 * balances. Explanations live behind the "?".
 */
export default function RewardsScreen() {
  return (
    <Screen>
      <TabHeader help={REWARDS_HELP} />

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
