import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useTheme } from '@/hooks/use-theme';

/**
 * Rewards tab (Plasma One-style): cashback earned on card spending +
 * referrals. Cashback accrual wires up with the card program (loyalty-tiered,
 * paid weekly alongside interest); until then this presents the real shape
 * with zero balances.
 */
export default function RewardsScreen() {
  const theme = useTheme();
  return (
    <Screen>
      <ThemedText type="subtitle">Rewards</ThemedText>

      <Card style={styles.gap}>
        <ThemedText type="small" themeColor="textSecondary">
          CASHBACK EARNED
        </ThemedText>
        <ThemedText type="title">$0.00</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Earn cashback on every card purchase. Rewards land every Thursday,
          together with your weekly interest.
        </ThemedText>
      </Card>

      <Card style={styles.gap}>
        <ThemedText type="smallBold">Invite friends</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Referrals are coming soon — invite friends, earn a share of their
          rewards.
        </ThemedText>
      </Card>

      <View style={[styles.hint, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="small" themeColor="textSecondary">
          Higher reward tiers unlock bigger cashback and larger weekly
          top-ups to your card.
        </ThemedText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 8 },
  hint: { borderRadius: 12, padding: 14 },
});
