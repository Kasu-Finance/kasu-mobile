import { Fragment, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';
import { BottomSheet } from '@/features/onramp/sheet';
import { useViewAddress } from '@/lib/web3/use-view-address';

import { ActivityRow } from './activity-row';
import { stubActivityItems, toActivityItems, type ActivityItem } from './types';
import { useTransactionHistory } from './use-transaction-history';

/**
 * "Recent activity" feed.
 *
 * Pulls real on-chain history for the view address via the SDK portfolio
 * facade. In DEMO mode — or whenever that history is empty/unavailable — it
 * falls back to a realistic stubbed feed so the tab always looks alive. A small
 * banner makes the stubbed state explicit.
 */
export default function ActivityScreen() {
  const theme = useTheme();
  const { viewAddress, isDemo } = useViewAddress();
  const query = useTransactionHistory(viewAddress);

  // The tapped row, surfaced in a bottom sheet. `null` = sheet closed.
  const [selected, setSelected] = useState<ActivityItem | null>(null);

  const realItems = useMemo<ActivityItem[]>(
    () => (query.data ? toActivityItems(query.data) : []),
    [query.data],
  );

  const usingStub = realItems.length === 0;
  const items = usingStub ? stubActivityItems() : realItems;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="subtitle">Recent activity</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Deposits, yield and withdrawals across your Kasu strategies.
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
        </Card>
      )}

      {usingStub && !query.isLoading ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
          {isDemo
            ? 'Showing sample activity for this demo portfolio.'
            : 'No on-chain activity yet — showing sample activity.'}
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
