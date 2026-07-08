import { SymbolView } from 'expo-symbols';
import { Linking, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BottomSheetModal } from '@/components/ui/bottom-sheet-modal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';

const DETAILS_URL =
  'https://docs.kasu.finance/important-information-when-lending/important-information';

const STEPS = [
  'Tap "Invite friends" on the Rewards page',
  'Share your access code',
  'Cashback is applied to your account each time a friend’s transaction settles',
];

/** Referrals explainer sheet (Plasma's Referrals bottom sheet). */
export function ReferralsSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();
  return (
    <BottomSheetModal visible={visible} onClose={onClose}>
      <View style={styles.iconWrap}>
        <SymbolView name="person.badge.plus.fill" size={30} tintColor={theme.text} />
      </View>
      <ThemedText type="subtitle" style={styles.center}>
        Referrals
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        0.25% back from your friends’ spend.
      </ThemedText>

      <Card style={styles.card}>
        <ThemedText type="small" themeColor="textSecondary">
          How to use
        </ThemedText>
        <ThemedText type="small">
          When friends join with your referral link, you’ll earn 0.25% in referral
          rewards every time they spend. Available for a limited time.
        </ThemedText>
        <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
        {STEPS.map((step, i) => (
          <View key={step} style={styles.stepRow}>
            <View style={[styles.stepNum, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="smallBold">{i + 1}</ThemedText>
            </View>
            <ThemedText type="small" style={styles.stepText}>
              {step}
            </ThemedText>
          </View>
        ))}
      </Card>

      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.center}
        onPress={() => Linking.openURL(DETAILS_URL).catch(() => {})}>
        Cashback limits apply.{' '}
        <ThemedText type="smallBold" themeColor="primary">
          See full details.
        </ThemedText>
      </ThemedText>

      <Button title="Close" variant="secondary" onPress={onClose} />
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', paddingTop: 4 },
  center: { textAlign: 'center' },
  card: { gap: 10 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { flex: 1 },
});
