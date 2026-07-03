import { Stack, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';

/**
 * "My bank" — linked bank accounts. Reached from Home → Accounts. Bank linking
 * isn't wired yet (needs the fiat rail — plan W9), so this renders an explicit
 * empty state.
 */
export default function MyBankRoute() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.title}>
          My bank
        </ThemedText>
        <Button
          title="Close"
          variant="ghost"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={styles.close}
        />
      </View>

      <View style={styles.body}>
        <ThemedText type="small" themeColor="textSecondary">
          Linked bank account
        </ThemedText>
        <Card style={styles.card}>
          <ThemedText type="smallBold">No linked bank account yet</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Linking a bank account for fiat deposits and withdrawals is coming
            soon. You can add money now with a direct transfer from the Add money screen.
          </ThemedText>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  title: { fontSize: 28, lineHeight: 34 },
  close: { height: 40, paddingHorizontal: 14 },
  body: { padding: 20, gap: 12 },
  card: { gap: 12 },
});
