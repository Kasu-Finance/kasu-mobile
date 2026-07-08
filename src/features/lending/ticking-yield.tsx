import { useEffect, useRef, useState } from 'react';
import type { StyleProp, TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';

const SECONDS_PER_DAY = 86_400;
const TICK_INTERVAL_MS = 1_000;

/**
 * Live lifetime-yield ticker. Mirrors kasu-ui's `TickingLifetimeInterest`:
 * adds `(dailyInterest / 86_400) × elapsedSec` on top of the latest `base`
 * from the portfolio summary so the figure visibly creeps up every second.
 *
 * `base` is the lifetime yield at the moment of the last fetch and
 * `dailyInterest` is the forward run-rate (invested × APY ÷ 365). When the
 * portfolio refetches, the parent passes a fresh `base`/`dailyInterest`; the
 * effect below re-snaps `display` to the new `base` so the ticker never
 * double-counts accruals already folded into the new baseline.
 *
 * Renders with 4 fraction digits — enough resolution to see the per-second
 * movement on a realistic six-figure position.
 */
export function TickingYield({
  base,
  dailyInterest,
  style,
  fractionDigits = 4,
}: {
  base: number;
  dailyInterest: number;
  style?: StyleProp<TextStyle>;
  fractionDigits?: number;
}) {
  const [display, setDisplay] = useState(base);
  // Hold the freshest base/rate so the interval callback always reads
  // current values without resubscribing every tick.
  const baseRef = useRef(base);
  const rateRef = useRef(dailyInterest);
  baseRef.current = base;
  rateRef.current = dailyInterest;

  useEffect(() => {
    // Snap to the latest base immediately on (re)fetch, then accrue from
    // this instant forward so we don't lag the new baseline by a tick.
    const t0 = Date.now();
    setDisplay(base);
    const id = setInterval(() => {
      const elapsedSec = (Date.now() - t0) / 1000;
      setDisplay(baseRef.current + (rateRef.current / SECONDS_PER_DAY) * elapsedSec);
    }, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [base, dailyInterest]);

  const formatted = `$${display.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;

  return (
    <ThemedText type="title" style={[{ fontSize: 28, lineHeight: 34 }, style]}>
      {formatted}
    </ThemedText>
  );
}
