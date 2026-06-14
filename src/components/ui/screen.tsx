import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

/**
 * Standard screen wrapper: themed background, safe-area, optional scroll.
 * `edges` controls which safe-area insets are applied (default top only). Pass
 * `edges={[]}` when an ancestor already handles the top inset (e.g. a fixed
 * header above the scroll body).
 */
export function Screen({
  children,
  scroll = true,
  edges = ['top'],
}: PropsWithChildren<{ scroll?: boolean; edges?: readonly Edge[] }>) {
  const theme = useTheme();
  const Body = <View style={styles.body}>{children}</View>;
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        Body
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { flex: 1, padding: 20, gap: 16 },
  scroll: { padding: 20, gap: 16 },
});
