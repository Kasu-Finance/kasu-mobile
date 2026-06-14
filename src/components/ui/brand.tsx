import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/**
 * Brand lockup — deliberately minimal: the `KASU` wordmark only. The
 * `kasu-mark.svg` asset is kept in `assets/brand/` for the splash/icon but the
 * in-app brand is intentionally just the wordmark (per design direction).
 */
export function Brand({ size = 28 }: { size?: number }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text
        style={[
          styles.wordmark,
          { color: theme.text, fontSize: size, letterSpacing: size * 0.18 },
        ]}>
        KASU
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  wordmark: { fontWeight: '700' },
});
