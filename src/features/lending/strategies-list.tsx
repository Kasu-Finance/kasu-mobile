import type { Strategy } from '@kasufinance/kasu-sdk';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatUsd } from '@/lib/format';

import {
  deriveStrategyStatus,
  filterLiveStrategies,
  formatStrategyApyRange,
  trancheFlow,
} from './lib/strategy-display';
import { useStrategies } from './use-strategies';

export interface StrategiesListProps {
  /** Tapping a strategy card surfaces it (caller routes to the detail screen). */
  onSelect: (strategy: Strategy) => void;
}

/**
 * Lists the active lending strategies as cards styled to the Kasu web design:
 * a serif title + status pill, an elevated Net APY panel with the headline brass
 * figure, and divided TVL / capacity rows. Dead $0-TVL placeholders are filtered.
 */
export function StrategiesList({ onSelect }: StrategiesListProps) {
  const { data, isLoading, isError, refetch } = useStrategies();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isError) {
    return (
      <Card style={styles.gap}>
        <ThemedText type="smallBold">Couldn&apos;t load strategies</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Pull to retry, or tap below.
        </ThemedText>
        <Pressable accessibilityRole="button" onPress={() => refetch()}>
          <ThemedText type="link" themeColor="text">
            Retry
          </ThemedText>
        </Pressable>
      </Card>
    );
  }

  // Only lendable strategies — drop $0-TVL placeholders and Full ones.
  const strategies = filterLiveStrategies(data ?? []).filter(
    (s) => deriveStrategyStatus(s) !== 'Full',
  );
  if (strategies.length === 0) {
    return (
      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          No strategies are available on this network yet.
        </ThemedText>
      </Card>
    );
  }

  return (
    <View style={styles.list}>
      {strategies.map((strategy) => (
        <StrategyCard key={strategy.id} strategy={strategy} onPress={() => onSelect(strategy)} />
      ))}
    </View>
  );
}

function StrategyCard({ strategy, onPress }: { strategy: Strategy; onPress: () => void }) {
  const theme = useTheme();
  const apyRange = formatStrategyApyRange(strategy);
  const flow = trancheFlow(strategy);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${strategy.name}`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
      <Card style={styles.cardGap}>
        <Text style={[styles.title, { color: theme.text }]}>{strategy.name}</Text>

        {/* Net APY — headline value + tranche flow, compact. */}
        <View style={styles.apyRow}>
          <View style={styles.apyLeft}>
            <ThemedText type="small" themeColor="textSecondary">
              Net APY
            </ThemedText>
            {flow.length > 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                {flow.join(' → ')}
              </ThemedText>
            )}
          </View>
          <Text style={[styles.apyValue, { color: theme.primary }]}>{apyRange}</Text>
        </View>

        {/* One compact meta line. */}
        <View style={styles.metaRow}>
          <ThemedText type="small" themeColor="textSecondary">
            TVL {formatUsd(strategy.tvl.total)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatUsd(strategy.availableCapacity)} available
          </ThemedText>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  gap: { gap: 6 },
  cardGap: { gap: 10 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  title: { flex: 1, fontFamily: Fonts.serifBold, fontSize: 18, lineHeight: 24 },
  apyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  apyLeft: { gap: 2, flexShrink: 1 },
  apyValue: { fontFamily: Fonts.serifBold, fontSize: 24, lineHeight: 28 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  pill: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999 },
  pillText: { fontFamily: Fonts.sansSemiBold, fontSize: 13 },
  center: { paddingVertical: 32, alignItems: 'center' },
});
