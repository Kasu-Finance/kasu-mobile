import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ACCENT } from '@/components/ui/theme-extras';
import { formatUsd } from '@/lib/format';
import { useViewAddress } from '@/lib/web3/use-view-address';

import { usePortfolio } from './use-portfolio';

/** Day-of-week for the weekly epoch boundary (Thursday). */
const EPOCH_WEEKDAY = 4; // 0=Sun … 4=Thu
/** UTC hour the epoch settles. */
const EPOCH_HOUR_UTC = 6;

/**
 * Returns the next weekly-epoch boundary (Thursday 06:00 UTC) strictly after
 * `now`. Epochs settle every Thursday at 06:00 UTC; deposit/withdraw and yield
 * top-ups land on the card at that boundary.
 */
export function nextEpoch(now: Date): Date {
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      EPOCH_HOUR_UTC,
      0,
      0,
      0,
    ),
  );
  // Advance to the next Thursday (0..6 days out).
  let delta = (EPOCH_WEEKDAY - next.getUTCDay() + 7) % 7;
  next.setUTCDate(next.getUTCDate() + delta);
  // If that lands on/before now (e.g. it's already Thu past 06:00), jump a week.
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 7);
  }
  return next;
}

/** Format a millisecond remaining-span as a compact "3d 14h" / "14h 5m" / "5m". */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * The product hook on Home: "Spend yield from your VISA card."
 *
 * Shows a live countdown to the next weekly epoch (Thursday 06:00 UTC) and the
 * $ yield that will be credited to the user's VISA card at that epoch.
 */
export function EpochYield() {
  const { viewAddress } = useViewAddress();
  const { data } = usePortfolio(viewAddress);

  // Re-render once a minute so the countdown stays current.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const countdown = useMemo(() => {
    const target = nextEpoch(new Date(now));
    return formatCountdown(target.getTime() - now);
  }, [now]);

  const weeklyYield = data?.summary.weekly.yieldEarnings;
  const amountText = weeklyYield != null ? formatUsd(weeklyYield) : '—';

  return (
    <Card style={[styles.card, { borderColor: ACCENT }]}>
      <ThemedText type="smallBold" style={{ color: ACCENT }}>
        Weekly top up
      </ThemedText>

      <ThemedText type="title" style={styles.amount}>
        {amountText}
      </ThemedText>

      <View style={styles.row}>
        <ThemedText type="smallBold">Next top-up in {countdown}</ThemedText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6, borderWidth: 1 },
  amount: { fontSize: 36, lineHeight: 42 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
