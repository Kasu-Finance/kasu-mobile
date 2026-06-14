import type { PortfolioLendingPool } from '@kasufinance/kasu-sdk';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';
import { formatApy, formatUsd } from '@/lib/format';
import { useSdk } from '@/lib/sdk/use-sdk';
import { getChain } from '@/lib/web3/chains';
import { useViewAddress } from '@/lib/web3/use-view-address';

import { TickingYield } from './ticking-yield';
import { usePortfolio } from './use-portfolio';

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
  const theme = useTheme();
  const { chainId } = useSdk();
  const stable = getChain(chainId).stableAsset;
  const { viewAddress, isDemo } = useViewAddress();
  const { data, isLoading, isError } = usePortfolio(viewAddress);
  // Read-only when viewing a demo address — the connected signer can't withdraw
  // someone else's position, so don't offer the action.
  const effectiveOnWithdraw = isDemo ? undefined : onWithdraw;

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
      <Card style={styles.gapSmall}>
        <ThemedText type="small" themeColor="textSecondary">
          Total invested
        </ThemedText>
        <ThemedText type="title" style={styles.amount}>
          {formatUsd(invested)}
        </ThemedText>
        <View style={styles.rowBetween}>
          <ThemedText type="small" themeColor="textSecondary">
            Avg APY {Number.isFinite(apy) ? formatApy(apy) : '—'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatUsd(summary.weekly.yieldEarnings)} / week
          </ThemedText>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
        <ThemedText type="small" themeColor="textSecondary">
          Lifetime yield
        </ThemedText>
        {Number.isFinite(lifetimeYieldBase) ? (
          // `key` resets the ticker baseline on refetch so the displayed
          // value snaps to the new `base` rather than double-counting.
          <TickingYield
            key={`${lifetimeYieldBase}-${dailyInterest}`}
            base={lifetimeYieldBase}
            dailyInterest={dailyInterest}
          />
        ) : (
          <ThemedText type="title" style={{ fontSize: 28, lineHeight: 34 }}>
            —
          </ThemedText>
        )}
      </Card>

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
              {tranche.name} · {formatUsd(invested)} {stableSymbol}
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
  amount: { fontSize: 36, lineHeight: 42 },
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
