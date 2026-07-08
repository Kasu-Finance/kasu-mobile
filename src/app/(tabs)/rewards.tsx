import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GradientCard } from '@/components/ui/gradient-card';
import { Screen } from '@/components/ui/screen';
import { TabHeader } from '@/components/ui/tab-header';
import { ACCENT } from '@/components/ui/theme-extras';
import { CashbackSheet } from '@/features/rewards/cashback-sheet';
import { ReferralsSheet } from '@/features/rewards/referrals-sheet';
import { useRewards, type RewardPayout } from '@/features/rewards/use-rewards';
import { useTheme } from '@/hooks/use-theme';
import { formatUsd } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useViewAddress } from '@/lib/web3/use-view-address';

const GREEN = '#84a45f';
const REWARDS_GRADIENT = { from: '#2b2f3d', to: '#242430', border: 'rgba(255,255,255,0.08)' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function shortDate(seconds: number): string {
  if (!seconds) return '';
  const d = new Date(seconds * 1000);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

type SheetKind = 'cashback' | 'referrals' | null;

/**
 * Rewards tab (Plasma One's "Tier" screen): tier + points, the rewards
 * card (cashback + referrals), a list of payouts derived from real card
 * purchases, and Cashback / Referrals explainer sheets.
 */
export default function RewardsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { viewAddress } = useViewAddress();
  const { data: rewards } = useRewards(viewAddress);
  const [sheet, setSheet] = useState<SheetKind>(null);

  const payouts = rewards.payouts.slice(0, 3);

  return (
    <Screen>
      <TabHeader />

      {/* Tier + points */}
      <View style={styles.tier}>
        <ThemedText type="small" themeColor="textSecondary">
          {rewards.tier}
        </ThemedText>
        <ThemedText type="title" style={styles.points}>
          {rewards.points.toLocaleString()} <ThemedText type="title" themeColor="textSecondary">Points</ThemedText>
        </ThemedText>
        <View style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small" themeColor="textSecondary">
            {rewards.pointsToNext.toLocaleString()} to {rewards.nextTier}
          </ThemedText>
        </View>
      </View>

      <View style={styles.actions}>
        <Button title="Invite friends" onPress={() => setSheet('referrals')} style={styles.actionBtn} />
        <Button
          title="How it works"
          variant="secondary"
          onPress={() => setSheet('cashback')}
          style={styles.actionBtn}
        />
      </View>

      {/* Rewards card */}
      <GradientCard {...REWARDS_GRADIENT} contentStyle={styles.rewardsCard}>
        <View style={styles.rewardsHead}>
          <View style={styles.rewardsTitle}>
            <SymbolView name="gift.fill" size={18} tintColor={ACCENT} />
            <ThemedText type="smallBold">Rewards</ThemedText>
          </View>
          <ThemedText type="smallBold">{formatUsd(rewards.total)}</ThemedText>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
        <View style={styles.rewardsSplit}>
          <Pressable style={styles.splitCol} onPress={() => setSheet('cashback')} accessibilityRole="button">
            <ThemedText type="small" themeColor="textSecondary">Cashback</ThemedText>
            <ThemedText type="subtitle">{formatUsd(rewards.cashback)}</ThemedText>
          </Pressable>
          <View style={[styles.splitLine, { backgroundColor: theme.backgroundSelected }]} />
          <Pressable style={styles.splitCol} onPress={() => setSheet('referrals')} accessibilityRole="button">
            <ThemedText type="small" themeColor="textSecondary">Referrals</ThemedText>
            <ThemedText type="subtitle">{formatUsd(rewards.referrals)}</ThemedText>
          </Pressable>
        </View>
      </GradientCard>

      {/* Payouts */}
      <Card style={styles.payoutCard}>
        {payouts.length > 0 ? (
          payouts.map((p, i) => (
            <View key={p.id}>
              {i > 0 ? <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} /> : null}
              <PayoutRow payout={p} />
            </View>
          ))
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            No rewards yet — spend on your card to start earning cashback.
          </ThemedText>
        )}
        {rewards.payouts.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/activity')}
            style={styles.viewAll}>
            <ThemedText type="smallBold" themeColor="primary">View all</ThemedText>
          </Pressable>
        ) : null}
      </Card>

      {/* Daily benefits */}
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
        Daily benefits
      </ThemedText>
      <View style={styles.benefits}>
        <BenefitTile icon="arrow.uturn.backward" label="Cashback" onPress={() => setSheet('cashback')} />
        <BenefitTile icon="person.badge.plus.fill" label="Referrals" onPress={() => setSheet('referrals')} />
      </View>

      <CashbackSheet visible={sheet === 'cashback'} onClose={() => setSheet(null)} rewards={rewards} />
      <ReferralsSheet visible={sheet === 'referrals'} onClose={() => setSheet(null)} />
    </Screen>
  );
}

function PayoutRow({ payout }: { payout: RewardPayout }) {
  const theme = useTheme();
  return (
    <View style={styles.payoutRow}>
      <View style={[styles.payoutIcon, { backgroundColor: theme.backgroundSelected }]}>
        <SymbolView name="gift.fill" size={18} tintColor={ACCENT} />
      </View>
      <View style={styles.payoutText}>
        <ThemedText type="smallBold">Rewards payout</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {payout.merchant} · {shortDate(payout.date)}
        </ThemedText>
      </View>
      <ThemedText type="smallBold" style={{ color: GREEN }}>
        +{payout.points.toLocaleString()} Points
      </ThemedText>
    </View>
  );
}

function BenefitTile({
  icon,
  label,
  onPress,
}: {
  icon: SymbolViewProps['name'];
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={[styles.tile, { backgroundColor: theme.backgroundElement }]}>
      <SymbolView name={icon} size={22} tintColor={theme.text} />
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tier: { alignItems: 'center', gap: 6, paddingTop: 8 },
  points: { fontSize: 40, lineHeight: 46 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1 },
  rewardsCard: { gap: 12 },
  rewardsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rewardsTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rewardsSplit: { flexDirection: 'row', alignItems: 'center' },
  splitCol: { flex: 1, alignItems: 'center', gap: 2 },
  splitLine: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  divider: { height: StyleSheet.hairlineWidth },
  payoutCard: { gap: 0 },
  payoutRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  payoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payoutText: { flex: 1, gap: 1 },
  viewAll: { alignItems: 'center', paddingVertical: 12 },
  sectionLabel: { letterSpacing: 0.5 },
  benefits: { flexDirection: 'row', gap: 12 },
  tile: {
    flex: 1,
    gap: 8,
    padding: 16,
    borderRadius: 16,
    alignItems: 'flex-start',
  },
});
