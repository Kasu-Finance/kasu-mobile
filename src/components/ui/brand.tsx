import { StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { KasuMark } from './kasu-mark';

/**
 * Brand lockup — the minimalist chevron mark + the `Kasu` wordmark set in
 * Crimson Text (the brand serif). `color` tints both; pass the brass accent for
 * an accented lockup, otherwise it defaults to the foreground.
 */
export function Brand({ size = 28, color }: { size?: number; color?: string }) {
  const theme = useTheme();
  const tint = color ?? theme.text;
  return (
    <View style={[styles.row, { gap: size * 0.32 }]}>
      <KasuMark size={size * 1.12} color={tint} />
      <Text style={[styles.wordmark, { color: tint, fontSize: size * 1.18 }]}>Kasu</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  wordmark: { fontFamily: Fonts.serifBold, letterSpacing: 0.5, includeFontPadding: false },
});
