import type { Strategy, StrategyTranche } from '@kasufinance/kasu-sdk';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ACCENT } from '@/components/ui/theme-extras';
import { useTheme } from '@/hooks/use-theme';
import { formatApy, formatUsd } from '@/lib/format';
import { useSdk } from '@/lib/sdk/use-sdk';
import { getChain } from '@/lib/web3/chains';

import {
  deriveStrategyStatus,
  trancheHasCapacity,
  type StrategyStatus,
} from './lib/strategy-display';

export interface StrategyDetailsProps {
  strategy: Strategy;
  /** Tapping an Option (tranche) — caller advances to the amount screen. */
  onSelectOption: (tranche: StrategyTranche) => void;
}

function parseBound(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  const n = typeof raw === 'string' ? Number(raw) : raw;
  return Number.isFinite(n) && n > 0 ? n : null;
}

const MAX_DEPOSIT_CAP_THRESHOLD = 1_000_000_000; // $1B → "No cap"

/**
 * Strategy overview: the name + status, then the **Options** (tranches) as
 * tappable cards — picking one goes straight to the amount screen (no separate
 * "Lend" button). The key-data table + "About" copy live behind the header "?"
 * ({@link StrategyHelpContent}); the Net APY panel is gone.
 */
export function StrategyDetails({ strategy, onSelectOption }: StrategyDetailsProps) {
  const status = deriveStrategyStatus(strategy);

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <ThemedText type="subtitle" style={styles.name}>
          {strategy.name}
        </ThemedText>
        <StatusPill status={status} />
      </View>
      {!!strategy.assetClass && (
        <ThemedText type="small" themeColor="textSecondary">
          {strategy.assetClass}
        </ThemedText>
      )}

      <View style={styles.section}>
        <ThemedText type="smallBold" style={styles.sectionTitle}>
          Options
        </ThemedText>
        <View style={styles.gap}>
          {strategy.tranches.map((tranche) => (
            <OptionCard
              key={tranche.id}
              tranche={tranche}
              onPress={() => onSelectOption(tranche)}
            />
          ))}
        </View>
      </View>

      <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
        Choose an option to continue. Deposits settle at the next weekly epoch;
        APYs are indicative and vary by option and term.
      </ThemedText>
    </View>
  );
}

/**
 * The strategy's key data + description, rendered inside the header "?" sheet.
 */
export function StrategyHelpContent({ strategy }: { strategy: Strategy }) {
  const { chainId } = useSdk();
  const stable = getChain(chainId).stableAsset;
  const status = deriveStrategyStatus(strategy);

  const minDeposit = strategy.tranches
    .map((t) => Number(t.minimumDeposit))
    .filter((n) => Number.isFinite(n) && n > 0)
    .reduce<number | null>((acc, n) => (acc == null || n < acc ? n : acc), null);

  return (
    <View style={styles.helpGap}>
      <Card style={styles.cardGap}>
        <InfoRow label="APY Structure" value={`${strategy.apyStructure} APY`} />
        <InfoRow label="Total Value Locked" value={formatUsd(strategy.tvl.total)} />
        <InfoRow
          label="Available Capacity"
          value={status === 'Full' ? 'Full' : formatUsd(strategy.availableCapacity)}
        />
        <InfoRow
          label="Min. Lending Amount"
          value={minDeposit != null ? formatUsd(minDeposit) : '—'}
        />
        <InfoRow label="Currency" value={stable.symbol} />
        {strategy.tranches.length > 0 && (
          <InfoRow
            label="Options"
            value={strategy.tranches.map((t) => t.name).join(' · ')}
            last
          />
        )}
      </Card>

      {!!strategy.description && (
        <View style={styles.section}>
          <ThemedText type="smallBold">About this strategy</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {strategy.description}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

function OptionCard({
  tranche,
  onPress,
}: {
  tranche: StrategyTranche;
  onPress: () => void;
}) {
  const theme = useTheme();
  const hasCapacity = trancheHasCapacity(tranche);
  const min = parseBound(tranche.minimumDeposit);
  const max = parseBound(tranche.maximumDeposit);
  const minLabel = min != null ? formatUsd(min) : 'No minimum';
  const maxLabel = max != null && max < MAX_DEPOSIT_CAP_THRESHOLD ? formatUsd(max) : 'No cap';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Lend into ${tranche.name}`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
      <Card style={styles.optionCard}>
        <View style={styles.optionHeader}>
          <View style={styles.optionTitle}>
            <ThemedText type="smallBold">{tranche.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {minLabel} – {maxLabel} ·{' '}
              {hasCapacity ? `${formatUsd(tranche.availableCapacity)} available` : 'Full'}
            </ThemedText>
          </View>
          <ThemedText type="smallBold" style={styles.optionApy}>
            {formatApy(tranche.apy)}
          </ThemedText>
          <SymbolView name="chevron.right" size={16} tintColor={theme.textSecondary} />
        </View>

        {tranche.fixedTermOptions.length > 0 && (
          <View style={styles.chips}>
            {tranche.fixedTermOptions.map((opt) => (
              <View key={opt.configId} style={styles.termChip}>
                <ThemedText type="small" style={styles.termChipText}>
                  {opt.epochLockDuration}w · {formatApy(opt.apy)}
                </ThemedText>
              </View>
            ))}
          </View>
        )}
      </Card>
    </Pressable>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.infoRow,
        !last && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.backgroundSelected,
        },
      ]}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.infoLabel}>
        {label}
      </ThemedText>
      <ThemedText type="small" style={styles.infoValue}>
        {value}
      </ThemedText>
    </View>
  );
}

function StatusPill({ status }: { status: StrategyStatus }) {
  const theme = useTheme();
  const live = status === 'Live';
  return (
    <View style={[styles.pill, { backgroundColor: live ? ACCENT : theme.backgroundSelected }]}>
      <ThemedText type="small" style={{ color: live ? '#241a0c' : theme.textSecondary }}>
        {status}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 14 },
  gap: { gap: 10 },
  helpGap: { gap: 14 },
  cardGap: { gap: 0 },
  section: { gap: 8 },
  sectionTitle: { color: ACCENT },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  name: { flex: 1, fontSize: 24, lineHeight: 30 },
  footnote: { textAlign: 'center' },
  optionCard: { gap: 10 },
  optionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  optionTitle: { flex: 1, gap: 2 },
  optionApy: { color: ACCENT, fontSize: 16 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  infoLabel: { flexShrink: 0 },
  infoValue: { flexShrink: 1, textAlign: 'right' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  termChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(210,158,97,0.16)',
  },
  termChipText: { color: ACCENT },
  pill: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999 },
});
