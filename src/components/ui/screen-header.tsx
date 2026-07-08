import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

/**
 * Standard screen header for pushed (full-screen) routes: a circular back
 * button on the left, an optional centered title, and an optional right slot
 * (e.g. a HelpButton). Plasma One-style. Keeps back navigation consistent
 * everywhere.
 */
export function ScreenHeader({
  title,
  onBack,
  right,
}: {
  title?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.header}>
      <View style={styles.side}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onBack}
            style={[styles.circle, { backgroundColor: theme.backgroundElement }]}>
            <SymbolView name="chevron.left" size={18} tintColor={theme.text} />
          </Pressable>
        ) : null}
      </View>
      {title ? (
        <ThemedText type="subtitle" numberOfLines={1} style={styles.title}>
          {title}
        </ThemedText>
      ) : (
        <View style={styles.title} />
      )}
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  side: { width: 40 },
  right: { alignItems: 'flex-end' },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, textAlign: 'center' },
});
