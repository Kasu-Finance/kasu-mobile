import type { Strategy, StrategyTranche } from '@kasufinance/kasu-sdk';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ACCENT } from '@/components/ui/theme-extras';
import { useTheme } from '@/hooks/use-theme';
import { formatApy, formatUsd } from '@/lib/format';
import { useSdk } from '@/lib/sdk/use-sdk';
import { getChain } from '@/lib/web3/chains';

import {
  deriveStrategyStatus,
  formatStrategyApyRange,
  trancheFlow,
  trancheHasCapacity,
  type StrategyStatus,
} from './lib/strategy-display';

export interface StrategyDetailsProps {
  strategy: Strategy;
  /** Tapping the Lend CTA — caller advances to the deposit flow. */
  onLend: () => void;
  /**
   * Optional back affordance. When provided, an in-screen "‹ Back" row is
   * rendered at the top of the details (the route hides the native header, so
   * this is the only way back). Omit it where a parent already provides one.
   */
  onBack?: () => void;
}

/**
 * Parse an ether-formatted `$` bound string into a usable number, or `null`
 * when it is unset / zero / non-finite. Mirrors kasu-ui's `parseTrancheBound`
 * (`features/lending/components/deposit-dialog/deposit-form.tsx`): only a
 * finite, strictly-positive value counts as a real bound.
 */
function parseBound(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  const n = typeof raw === 'string' ? Number(raw) : raw;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * A max that is unset, zero, or absurdly large (some pools store an
 * effectively-unbounded sentinel) reads as "No cap". Anything below this
 * threshold is treated as a genuine configured ceiling.
 */
const MAX_DEPOSIT_CAP_THRESHOLD = 1_000_000_000; // $1B

/**
 * Rich strategy detail view, inspired by kasu-ui's strategy card + details tab
 * (`features/lending/components/strategy-card.tsx`, `.../details-tab.tsx`).
 *
 * Sections, top to bottom:
 *  - Header: name, status pill (Live / Full), asset class
 *  - Net APY panel: headline APY range + tranche flow
 *  - Key data: APY structure, TVL, available capacity, min lending, currency
 *  - Tranche breakdown: per-tranche APY, min/max deposit, capacity, fixed terms
 *  - Description
 *  - Lend CTA (sticky-style at the bottom of the scroll)
 */
export function StrategyDetails({ strategy, onLend, onBack }: StrategyDetailsProps) {
  const { chainId } = useSdk();
  const theme = useTheme();
  const stable = getChain(chainId).stableAsset;
  const status = deriveStrategyStatus(strategy);
  const apyRange = formatStrategyApyRange(strategy);
  const flow = trancheFlow(strategy);

  // Smallest minimum deposit across tranches (matches kasu-ui's "Min. Lending").
  const minDeposit = strategy.tranches
    .map((t) => Number(t.minimumDeposit))
    .filter((n) => Number.isFinite(n) && n > 0)
    .reduce<number | null>((acc, n) => (acc == null || n < acc ? n : acc), null);

  return (
    <View style={styles.root}>
      {/* In-screen back affordance (the route hides the native header). */}
      {onBack && (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          style={styles.backRow}>
          <Text style={[styles.backChevron, { color: theme.textSecondary }]}>‹</Text>
          <ThemedText type="small" themeColor="textSecondary">
            Back
          </ThemedText>
        </Pressable>
      )}

      {/* Header */}
      <View style={styles.headerRow}>
        <ThemedText type="subtitle" style={styles.name}>
          {strategy.name}
        </ThemedText>
        <StatusPill status={status} />
      </View>
      {!!strategy.assetClass && (
        <ThemedText type="default" themeColor="textSecondary">
          {strategy.assetClass}
        </ThemedText>
      )}

      {/* Net APY panel */}
      <View style={styles.apyPanel}>
        <View style={styles.apyPanelLeft}>
          <ThemedText type="default">Net APY</ThemedText>
          {flow.length > 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              {flow.join(' → ')}
            </ThemedText>
          )}
        </View>
        <ThemedText type="title" style={styles.apyValue}>
          {apyRange}
        </ThemedText>
      </View>

      {/* Key data */}
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
            label="Risk Levels"
            value={strategy.tranches.map((t) => t.name).join(' · ')}
            last
          />
        )}
      </Card>

      {/* Tranche breakdown */}
      {strategy.tranches.length > 0 && (
        <View style={styles.section}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Tranches
          </ThemedText>
          <View style={styles.gap}>
            {strategy.tranches.map((tranche) => (
              <TrancheCard key={tranche.id} tranche={tranche} />
            ))}
          </View>
        </View>
      )}

      {/* Description */}
      {!!strategy.description && (
        <View style={styles.section}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            About this strategy
          </ThemedText>
          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              {strategy.description}
            </ThemedText>
          </Card>
        </View>
      )}

      {/* CTA */}
      <View style={styles.cta}>
        <Button
          title={status === 'Full' ? 'At full capacity' : 'Lend'}
          disabled={status === 'Full'}
          onPress={onLend}
        />
        <ThemedText type="small" themeColor="textSecondary" style={styles.ctaNote}>
          Deposits settle at the next weekly epoch. APYs are indicative and vary by tranche and
          term.
        </ThemedText>
      </View>
    </View>
  );
}

function TrancheCard({ tranche }: { tranche: StrategyTranche }) {
  const hasCapacity = trancheHasCapacity(tranche);

  // `minimumDeposit` / `maximumDeposit` are ether-formatted `$` strings. A
  // missing / `0` / non-finite bound is "no minimum" / "no cap" rather than a
  // misleading literal "$0". A huge max is also treated as uncapped.
  const min = parseBound(tranche.minimumDeposit);
  const max = parseBound(tranche.maximumDeposit);
  const minLabel = min != null ? formatUsd(min) : 'No minimum';
  const maxLabel = max != null && max < MAX_DEPOSIT_CAP_THRESHOLD ? formatUsd(max) : 'No cap';

  return (
    <Card style={styles.cardGap}>
      <View style={styles.trancheHeader}>
        <ThemedText type="smallBold">{tranche.name}</ThemedText>
        <ThemedText type="smallBold" style={styles.trancheApy}>
          {formatApy(tranche.apy)}
        </ThemedText>
      </View>

      <InfoRow label="Min / Max deposit" value={`${minLabel} – ${maxLabel}`} />
      <InfoRow
        label="Available capacity"
        value={hasCapacity ? formatUsd(tranche.availableCapacity) : 'Full'}
        last={tranche.fixedTermOptions.length === 0}
      />

      {tranche.fixedTermOptions.length > 0 && (
        <View style={styles.fixedTerms}>
          <ThemedText type="small" themeColor="textSecondary">
            Fixed-term options
          </ThemedText>
          <View style={styles.chips}>
            {tranche.fixedTermOptions.map((opt) => (
              <View key={opt.configId} style={styles.termChip}>
                <ThemedText type="small" style={styles.termChipText}>
                  {opt.epochLockDuration}w · {formatApy(opt.apy)}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      )}
    </Card>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.infoRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.backgroundSelected },
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
      <ThemedText type="small" style={{ color: live ? '#1a1208' : theme.textSecondary }}>
        {status}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 16 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backChevron: { fontSize: 22, lineHeight: 22, fontWeight: '600', marginTop: -2 },
  gap: { gap: 10 },
  cardGap: { gap: 0 },
  section: { gap: 8 },
  sectionTitle: { color: ACCENT },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  name: { flex: 1, fontSize: 28, lineHeight: 34 },
  apyPanel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(196, 153, 108, 0.12)',
  },
  apyPanelLeft: { gap: 2, flexShrink: 1 },
  apyValue: { color: ACCENT, fontSize: 32, lineHeight: 38 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  infoLabel: { flexShrink: 0 },
  infoValue: { flexShrink: 1, textAlign: 'right' },
  trancheHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 4 },
  trancheApy: { color: ACCENT, fontSize: 16 },
  fixedTerms: { gap: 8, paddingTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  termChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(196, 153, 108, 0.16)',
  },
  termChipText: { color: ACCENT },
  pill: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999 },
  cta: { gap: 8, paddingTop: 4 },
  ctaNote: { textAlign: 'center' },
});
