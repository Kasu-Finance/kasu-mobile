import { Linking, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BottomSheetModal } from '@/components/ui/bottom-sheet-modal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';
import { formatUsd } from '@/lib/format';

import { ProgressRing } from './progress-ring';
import { BASE_RATE, MONTHLY_CAP, type RewardsModel } from './use-rewards';

const DETAILS_URL =
  'https://docs.kasu.finance/important-information-when-lending/important-information';

/**
 * Cashback explainer sheet (Plasma's Cashback bottom sheet), driven by the real
 * rewards model: the tiered rate, this month's progress vs the cap, reset date.
 */
export function CashbackSheet({
  visible,
  onClose,
  rewards,
}: {
  visible: boolean;
  onClose: () => void;
  rewards: RewardsModel;
}) {
  const theme = useTheme();
  const eligibleSpend = Math.min(rewards.monthlySpend, MONTHLY_CAP);
  const eligibleCashback = eligibleSpend * BASE_RATE;

  return (
    <BottomSheetModal visible={visible} onClose={onClose}>
      <ThemedText type="subtitle" style={styles.center}>
        Cashback
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        Earn Points back on eligible card spend, up to your monthly limit.
      </ThemedText>

      <Card style={styles.card}>
        <View style={styles.tierRow}>
          <View style={styles.tierText}>
            <ThemedText type="smallBold">
              {Math.round(BASE_RATE * 100)}% on first {formatUsd(MONTHLY_CAP)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatUsd(eligibleCashback)} / {MONTHLY_CAP} monthly
            </ThemedText>
          </View>
          <ProgressRing progress={eligibleSpend / MONTHLY_CAP} />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          0.1% on the rest
        </ThemedText>
        <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
        <ThemedText type="small" themeColor="textSecondary">
          Resets on {rewards.resetDate}
        </ThemedText>
      </Card>

      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.center}
        onPress={() => Linking.openURL(DETAILS_URL).catch(() => {})}>
        Cashback limits apply. <ThemedText type="smallBold" themeColor="primary">See full details.</ThemedText>
      </ThemedText>

      <Button title="Get more cashback" onPress={onClose} />
      <Button title="Close" variant="secondary" onPress={onClose} />
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  card: { gap: 12 },
  tierRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  tierText: { flex: 1, gap: 2 },
  divider: { height: StyleSheet.hairlineWidth },
});
