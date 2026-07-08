import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ACCENT } from '@/components/ui/theme-extras';
import { formatApy, formatUsd } from '@/lib/format';
import { useViewAddress } from '@/lib/web3/use-view-address';

import { formatCountdown, nextEpoch } from './epoch-yield';
import { TickingYield } from './ticking-yield';
import { usePortfolio } from './use-portfolio';

const DAYS_PER_YEAR = 365;

/**
 * Earn summary — three lightweight label + value stats (Weekly top up, Total
 * invested, Lifetime yield), NO panel wrapper. Kept plain on purpose so the
 * gradient strategy cards below read as the clickable elements.
 */
export function EarnSummary() {
  const { viewAddress } = useViewAddress();
  const { data } = usePortfolio(viewAddress);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);
  const countdown = useMemo(
    () => formatCountdown(nextEpoch(new Date(now)).getTime() - now),
    [now],
  );

  const weekly = data?.summary.weekly.yieldEarnings;
  const invested = data?.summary.current.totalLendingPoolInvestments;
  const apy = Number(data?.summary.current.weightedAverageApy);
  const lifetimeBase = Number(data?.summary.lifetime.yieldEarnings);
  const investedNum = Number(invested);
  const dailyInterest =
    Number.isFinite(investedNum) && Number.isFinite(apy)
      ? (investedNum * apy) / DAYS_PER_YEAR
      : 0;

  return (
    <View style={styles.row}>
      <Stat
        label="Weekly top up"
        value={weekly != null ? formatUsd(weekly) : '—'}
        sub={`Next in ${countdown}`}
      />
      <Stat
        label="Total invested"
        value={invested != null ? formatUsd(invested) : '—'}
        sub={`Avg APY ${Number.isFinite(apy) ? formatApy(apy) : '—'}`}
      />
      <Stat
        label="Lifetime yield"
        value={
          Number.isFinite(lifetimeBase) ? (
            <TickingYield
              base={lifetimeBase}
              dailyInterest={dailyInterest}
              style={styles.value}
              fractionDigits={2}
            />
          ) : (
            '—'
          )
        }
      />
    </View>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
}) {
  return (
    <View style={styles.stat}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
        {label}
      </ThemedText>
      {typeof value === 'string' ? (
        <ThemedText type="title" style={styles.value}>
          {value}
        </ThemedText>
      ) : (
        value
      )}
      {sub ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {sub}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  stat: { flex: 1, gap: 3 },
  label: { color: ACCENT },
  value: { fontSize: 20, lineHeight: 26 },
});
