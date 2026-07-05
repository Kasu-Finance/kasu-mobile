import { Fragment, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';
import { BottomSheet } from '@/features/onramp/sheet';
import { useViewAddress } from '@/lib/web3/use-view-address';

import { useCardTransactions } from '@/features/card/use-card-transactions';

import { ActivityRow } from './activity-row';
import {
  cardTransactionToActivityItem,
  toActivityItems,
  type ActivityItem,
} from './types';
import { useTransactionHistory } from './use-transaction-history';

/**
 * "Recent activity" feed.
 *
 * Merges on-chain Kasu history (deposits, yield, withdrawals — via the SDK
 * portfolio facade) with card purchases (via `/mobile/card/transactions`),
 * newest first. An empty feed renders an explicit empty state.
 */
/**
 * Recent activity feed. On Home it's capped (`limit`) with a "View all" that
 * navigates to the full list; on the Activity route it shows everything.
 */
export default function ActivityScreen({
  limit,
  onViewAll,
}: {
  limit?: number;
  onViewAll?: () => void;
} = {}) {
  const theme = useTheme();
  const { viewAddress } = useViewAddress();
  const query = useTransactionHistory(viewAddress);
  const cardQuery = useCardTransactions(viewAddress);

  // The tapped row, surfaced in a bottom sheet. `null` = sheet closed.
  const [selected, setSelected] = useState<ActivityItem | null>(null);

  const allItems = useMemo<ActivityItem[]>(() => {
    const lending = query.data ? toActivityItems(query.data) : [];
    const card = (cardQuery.data ?? []).map(cardTransactionToActivityItem);
    return [...lending, ...card].sort((a, b) => b.timestamp - a.timestamp);
  }, [query.data, cardQuery.data]);

  const items = limit ? allItems.slice(0, limit) : allItems;
  const hasMore = limit != null && allItems.length > limit;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="subtitle">Recent activity</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Your card purchases, deposits and weekly interest.
        </ThemedText>
      </View>

      {query.isLoading ? (
        <Card style={styles.center}>
          <ActivityIndicator color={theme.textSecondary} />
        </Card>
      ) : (
        <Card style={styles.feedCard}>
          {items.map((item, i) => (
            <Fragment key={item.id}>
              {i > 0 ? (
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.backgroundSelected },
                  ]}
                />
              ) : null}
              <ActivityRow item={item} onPress={() => setSelected(item)} />
            </Fragment>
          ))}
          {hasMore && onViewAll ? (
            <>
              <View
                style={[styles.divider, { backgroundColor: theme.backgroundSelected }]}
              />
              <Pressable
                accessibilityRole="button"
                onPress={onViewAll}
                style={styles.viewAll}>
                <ThemedText type="smallBold" themeColor="primary">
                  View all
                </ThemedText>
              </Pressable>
            </>
          ) : null}
        </Card>
      )}

      {items.length === 0 && !query.isLoading ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
          No activity yet — top up or lend to get started.
        </ThemedText>
      ) : null}

      <BottomSheet
        visible={selected != null}
        title={selected?.title ?? 'Transaction'}
        onClose={() => setSelected(null)}>
        {selected ? (
          <View style={styles.detail}>
            <ThemedText
              type="title"
              style={[styles.detailAmount, { color: selected.positive ? POSITIVE : theme.text }]}>
              {selected.amount}
            </ThemedText>
            <View style={styles.detailRows}>
              {selected.details.map((detail) => (
                <View key={detail.label} style={styles.detailRow}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {detail.label}
                  </ThemedText>
                  <ThemedText type="small" style={styles.detailValue} numberOfLines={1}>
                    {detail.value}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}

/** Positive (green) accent for inflows — matches the activity row. */
const POSITIVE = '#84a45f';

const styles = StyleSheet.create({
  container: { gap: 16 },
  header: { gap: 4 },
  feedCard: { paddingVertical: 4 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32 },
  divider: { height: StyleSheet.hairlineWidth },
  note: { textAlign: 'center' },
  viewAll: { alignItems: 'center', paddingVertical: 12 },
  detail: { gap: 8 },
  detailAmount: { fontSize: 28, lineHeight: 34 },
  detailRows: { gap: 2 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
  },
  detailValue: { flexShrink: 1, textAlign: 'right' },
});
