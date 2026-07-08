import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';

/** Default quick-amount presets (Send). */
const DEFAULT_PRESETS: [string, number][] = [
  ['10%', 0.1],
  ['50%', 0.5],
  ['Max', 1],
];

type Key = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '0' | '.' | 'del';

const KEYS: Key[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];

function applyKey(value: string, key: Key): string {
  if (key === 'del') return value.slice(0, -1);
  if (key === '.') {
    if (value.includes('.')) return value;
    return value === '' ? '0.' : value + '.';
  }
  if (value === '0') return key; // replace a lone leading zero
  const next = value + key;
  const frac = next.split('.')[1];
  if (frac && frac.length > 2) return value; // cap at 2 decimals
  return next;
}

/**
 * Plasma One-style amount entry: a big $ display, 10% / 50% / Max quick
 * amounts, and a custom number pad — no system keyboard (so nothing overlaps),
 * and a cleaner feel than a text field.
 */
export function AmountKeypad({
  value,
  onChange,
  available,
  onContinue,
  continueLabel = 'Continue',
  error,
  presets = DEFAULT_PRESETS,
  header,
  note,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Available balance in dollars, for the % chips. */
  available: number;
  onContinue: () => void;
  continueLabel?: string;
  error?: string | null;
  /** Quick-amount presets: [label, fraction]. */
  presets?: [string, number][];
  /** Optional content above the amount (e.g. a source chip). */
  header?: ReactNode;
  /** Optional note under the button (e.g. a KYC requirement). */
  note?: string;
  /** Force-disable the continue button (e.g. gated on KYC). */
  disabled?: boolean;
}) {
  const theme = useTheme();
  const amountNum = Number(value || '0');
  const valid = amountNum > 0 && amountNum <= available && !disabled;

  const press = (key: Key) => {
    haptics.select();
    onChange(applyKey(value, key));
  };
  const setPct = (p: number) => {
    haptics.select();
    onChange((available * p).toFixed(2));
  };

  return (
    <View style={styles.container}>
      {header ? <View style={styles.headerSlot}>{header}</View> : null}
      <View style={styles.display}>
        <Text style={[styles.amount, { color: value ? theme.text : theme.textSecondary }]}>
          ${value || '0'}
        </Text>
        <ThemedText type="small" themeColor="textSecondary">
          ${available.toFixed(2)} available
        </ThemedText>
      </View>

      <View style={styles.chips}>
        {presets.map(([label, p]) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            onPress={() => setPct(p)}
            style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">{label}</ThemedText>
          </Pressable>
        ))}
      </View>

      <View style={styles.pad}>
        {KEYS.map((k) => (
          <Pressable
            key={k}
            accessibilityRole="button"
            accessibilityLabel={k === 'del' ? 'Delete' : k}
            onPress={() => press(k)}
            style={styles.key}>
            <Text style={[styles.keyText, { color: theme.text }]}>
              {k === 'del' ? '⌫' : k}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}
      <Button title={continueLabel} disabled={!valid} onPress={onContinue} />
      {note ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
          {note}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  headerSlot: { alignItems: 'center' },
  note: { textAlign: 'center' },
  display: { alignItems: 'center', gap: 4, paddingVertical: 8 },
  amount: { fontFamily: Fonts.serifBold, fontSize: 52, lineHeight: 58 },
  chips: { flexDirection: 'row', gap: 10 },
  chip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  pad: { flexDirection: 'row', flexWrap: 'wrap' },
  key: {
    width: '33.33%',
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontSize: 26, fontFamily: Fonts.sansMedium },
  error: { color: '#e4645a', textAlign: 'center' },
});
