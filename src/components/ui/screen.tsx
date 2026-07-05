import { type PropsWithChildren, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

/**
 * Standard screen wrapper: themed background, safe-area, optional scroll.
 * `edges` controls which safe-area insets are applied (default top only). Pass
 * `edges={[]}` when an ancestor already handles the top inset (e.g. a fixed
 * header above the scroll body).
 *
 * Pass `onRefresh` to enable pull-to-refresh (drag down from the top). It runs
 * the async handler and shows the spinner until it settles.
 */
export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  onRefresh,
}: PropsWithChildren<{
  scroll?: boolean;
  edges?: readonly Edge[];
  onRefresh?: () => Promise<unknown> | void;
}>) {
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const Body = <View style={styles.body}>{children}</View>;
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.primary}
                colors={[theme.primary]}
              />
            ) : undefined
          }>
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
