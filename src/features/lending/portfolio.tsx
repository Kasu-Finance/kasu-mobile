import type { PortfolioLendingPool } from '@kasufinance/kasu-sdk';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { GradientCard } from '@/components/ui/gradient-card';
import { formatApy, formatUsd } from '@/lib/format';
import { useSdk } from '@/lib/sdk/use-sdk';
import { getChain } from '@/lib/web3/chains';
import { useViewAddress } from '@/lib/web3/use-view-address';

import { EARN_GRADIENT } from './earn-panel';
import { TickingYield } from './ticking-yield';
import { usePortfolio } from './use-portfolio';
import { getTrancheDisplayName } from './lib/strategy-display';

/** Days per year used to turn invested × APY into a per-day run-rate. */
const DAYS_PER_YEAR = 365;

export interface PortfolioProps {
  /** Tapping a position opens the withdraw flow for that pool/tranche. */
  onWithdraw?: (poolId: string, trancheId: string) => void;
  /** Compact summary-only mode (used on the lending screen header). */
  summaryOnly?: boolean;
}

/**
 * The wallet's lending portfolio: an aggregate summary plus per-pool positions.
 * Amounts come back ether-formatted (decimal strings) from the SDK facade.
 */
export function Portfolio({ onWithdraw, summaryOnly = false }: PortfolioProps) {
  const { chainId } = useSdk();
  const stable = getChain(chainId).stableAsset;
  const { viewAddress } = useViewAddress();
  const { data, isLoading, isError } = usePortfolio(viewAddress);
  const effectiveOnWithdraw = onWithdraw;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          Couldn&apos;t load your portfolio. Pull to retry.
        </ThemedText>
      </Card>
    );
  }

  const { summary, pools } = data;
  const invested = summary.current.totalLendingPoolInvestments;
  const apy = Number(summary.current.weightedAverageApy);

  // Live lifetime-yield ticker inputs. `base` is the lifetime yield at the
  // moment of fetch; `dailyInterest` is the forward run-rate (invested × APY
  // ÷ 365), matching kasu-ui's Portfolio page. The ticker adds a per-second
  // slice of that run-rate on top of `base` so the figure creeps upward.
  const lifetimeYieldBase = Number(summary.lifetime.yieldEarnings);
  const investedAmount = Number(invested);
  const dailyInterest =
    Number.isFinite(investedAmount) && Number.isFinite(apy)
      ? (investedAmount * apy) / DAYS_PER_YEAR
      : 0;

  return (
    <View style={styles.gap}>
      <GradientCard {...EARN_GRADIENT} contentStyle={styles.summaryRow}>
        {/* Total invested + Lifetime yield share one compact row. */}
        <View style={styles.col}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.colLabel}>
            TOTAL INVESTED
          </ThemedText>
          <ThemedText type="title" style={styles.amount}>
            {formatUsd(invested)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Avg APY {Number.isFinite(apy) ? formatApy(apy) : '—'}
          </ThemedText>
        </View>
        <View style={[styles.col, styles.colRight]}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.colLabel}>
            LIFETIME YIELD
          </ThemedText>
          {Number.isFinite(lifetimeYieldBase) ? (
            // `key` resets the ticker baseline on refetch so the displayed
            // value snaps to the new `base` rather than double-counting.
            <TickingYield
              key={`${lifetimeYieldBase}-${dailyInterest}`}
              base={lifetimeYieldBase}
              dailyInterest={dailyInterest}
              style={styles.amount}
              fractionDigits={2}
            />
          ) : (
            <ThemedText type="title" style={styles.amount}>
              —
            </ThemedText>
          )}
        </View>
      </GradientCard>

      {!summaryOnly && (
        <View style={styles.gap}>
          {pools.length === 0 ? (
            <Card>
              <ThemedText type="small" themeColor="textSecondary">
                No active positions yet. Deposit into a strategy to get started.
              </ThemedText>
            </Card>
          ) : (
            pools.map((pool) => (
              <PoolPosition
                key={pool.id}
                pool={pool}
                stableSymbol={stable.symbol}
                onWithdraw={effectiveOnWithdraw}
              />
            ))
          )}
        </View>
      )}
    </View>
  );
}

function PoolPosition({
  pool,
  stableSymbol,
  onWithdraw,
}: {
  pool: PortfolioLendingPool;
  stableSymbol: string;
  onWithdraw?: (poolId: string, trancheId: string) => void;
}) {
  return (
    <Card style={styles.gapSmall}>
      <View style={styles.rowBetween}>
        <ThemedText type="smallBold">{pool.poolName}</ThemedText>
        <ThemedText type="smallBold">
          {/* NOTE: unlike `tranche.investedAmount` (ether-formatted), the SDK
              returns `pool.totalInvestedAmount` in 6-decimal BASE units, so it
              must be scaled down by 1e6 before display. */}
          {formatUsd(Number(pool.totalInvestedAmount) / 1e6)} {stableSymbol}
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Lifetime yield {formatUsd(pool.totalYieldEarningsLifetime)}
      </ThemedText>

      {pool.tranches.map((tranche) => {
        // `tranche.investedAmount` is the ether-formatted $ invested in this
        // tranche (e.g. "150000.5") — the same units summed into the summary's
        // "Total invested". The old code ran it through `formatUnits(_, 0)`,
        // which reinterprets it as a 0-decimal base-unit integer; the decimal
        // point made ethers throw, so it rendered "0 shares". Show the real $.
        const invested = tranche.investedAmount;
        if (Number(invested) <= 0) return null;
        return (
          <View key={tranche.id} style={styles.trancheRow}>
            <ThemedText type="small" themeColor="textSecondary">
              {getTrancheDisplayName(tranche.name, pool.poolName)} ·{' '}
              {formatUsd(invested)} {stableSymbol}
            </ThemedText>
            {onWithdraw && (
              <Pressable
                accessibilityRole="button"
                onPress={() => onWithdraw(pool.id, tranche.id)}>
                <ThemedText type="link" themeColor="text">
                  Withdraw
                </ThemedText>
              </Pressable>
            )}
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 12 },
  gapSmall: { gap: 6 },
  amount: { fontSize: 24, lineHeight: 30 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  col: { gap: 2, flexShrink: 1 },
  colRight: { alignItems: 'flex-end' },
  colLabel: { letterSpacing: 0.5 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trancheRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  center: { paddingVertical: 32, alignItems: 'center' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 6 },
});
