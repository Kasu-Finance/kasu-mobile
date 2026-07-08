import { useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GradientCard } from '@/components/ui/gradient-card';
import { ACCENT } from '@/components/ui/theme-extras';
import { formatUsd } from '@/lib/format';
import { useViewAddress } from '@/lib/web3/use-view-address';

import { EARN_GRADIENT } from './earn-panel';
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
    <GradientCard {...EARN_GRADIENT} contentStyle={styles.content}>
      <ThemedText type="smallBold" style={styles.label}>
        WEEKLY TOP UP
      </ThemedText>
      <ThemedText type="title" style={styles.amount}>
        {amountText}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Next top-up in {countdown}
      </ThemedText>
    </GradientCard>
  );
}

const styles = StyleSheet.create({
  content: { gap: 4 },
  label: { color: ACCENT, letterSpacing: 0.5 },
  amount: { fontSize: 34, lineHeight: 40 },
});
