import { Stack, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { CardScreen } from '@/features/card';
import { useTheme } from '@/hooks/use-theme';

/**
 * Card management screen — hosts the card state machine (onboarding →
 * verify identity → create → live card + top-up). Reached from Home.
 */
export default function CardDetailsRoute() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.background }]}
      edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <ThemedText type="subtitle">Card</ThemedText>
        <Button
          title="Close"
          variant="ghost"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/(tabs)')
          }
          style={styles.close}
        />
      </View>
      <View style={styles.body}>
        <CardScreen />
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
  close: { paddingHorizontal: 0 },
  body: { flex: 1, padding: 20, gap: 16 },
});
