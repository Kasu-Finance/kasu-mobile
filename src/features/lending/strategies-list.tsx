import type { Strategy } from '@kasufinance/kasu-sdk';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ACCENT } from '@/components/ui/theme-extras';
import { useTheme } from '@/hooks/use-theme';
import { formatUsd } from '@/lib/format';

import {
  deriveStrategyStatus,
  filterLiveStrategies,
  formatStrategyApyRange,
  trancheFlow,
  type StrategyStatus,
} from './lib/strategy-display';
import { useStrategies } from './use-strategies';

export interface StrategiesListProps {
  /** Tapping a strategy card surfaces it (caller routes to the detail screen). */
  onSelect: (strategy: Strategy) => void;
}

/**
 * Lists the active lending strategies as clean, tappable cards. Each card shows
 * the name, a status pill (Live / Full), asset class, the tranche APY range,
 * TVL, and remaining capacity. Obvious dead $0-TVL placeholder duplicates are
 * filtered out so the live strategies stay prominent.
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

  const strategies = filterLiveStrategies(data ?? []);
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
  const status = deriveStrategyStatus(strategy);
  const apyRange = formatStrategyApyRange(strategy);
  const flow = trancheFlow(strategy);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${strategy.name}`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
      <Card style={styles.cardGap}>
        <View style={styles.headerRow}>
          <ThemedText type="smallBold" style={styles.title}>
            {strategy.name}
          </ThemedText>
          <StatusPill status={status} />
        </View>

        {!!strategy.assetClass && (
          <ThemedText type="small" themeColor="textSecondary">
            {strategy.assetClass}
          </ThemedText>
        )}

        {/* Net APY panel — the headline number, with the tranche flow beneath. */}
        <View style={styles.apyPanel}>
          <View style={styles.apyPanelLeft}>
            <ThemedText type="small">Net APY</ThemedText>
            {flow.length > 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                {flow.join(' → ')}
              </ThemedText>
            )}
          </View>
          <ThemedText type="smallBold" style={styles.apyValue}>
            {apyRange}
          </ThemedText>
        </View>

        <View style={styles.metaRow}>
          <Meta label="TVL" value={formatUsd(strategy.tvl.total)} />
          <Meta
            label="Available"
            value={status === 'Full' ? 'Full' : formatUsd(strategy.availableCapacity)}
          />
        </View>
      </Card>
    </Pressable>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaCol}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

function StatusPill({ status }: { status: StrategyStatus }) {
  const theme = useTheme();
  const live = status === 'Live';
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: live ? ACCENT : theme.backgroundSelected },
      ]}>
      <ThemedText type="small" style={{ color: live ? '#241a0c' : theme.textSecondary }}>
        {status}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  gap: { gap: 6 },
  cardGap: { gap: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1 },
  apyPanel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(210,158,97,0.12)',
  },
  apyPanelLeft: { gap: 2, flexShrink: 1 },
  apyValue: { color: ACCENT, fontSize: 16 },
  metaRow: { flexDirection: 'row', gap: 24 },
  metaCol: { gap: 2 },
  pill: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999 },
  center: { paddingVertical: 32, alignItems: 'center' },
});
