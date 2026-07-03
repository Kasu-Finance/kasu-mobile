import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { VisaCard } from '@/components/ui/visa-card';

/**
 * Onboarding beat 1 — the landing screen (Plasma One-style): the card is the
 * hero, the motto sells, and identity is not requested yet. "Get started"
 * leads to the feature carousel; returning users jump straight to login.
 */
export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <VisaCard balance="1,284.06" />
        </View>

        <View style={styles.pitch}>
          <ThemedText type="subtitle">
            Spend yield from your VISA card.
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            The account where your money earns before you spend it.
          </ThemedText>
        </View>

        <View style={styles.actions}>
          <Button title="Get started" onPress={() => router.push('/(auth)/features')} />
          <Button
            title="I already have an account"
            variant="ghost"
            onPress={() => router.push('/(auth)/login')}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end', gap: 28, paddingBottom: 12 },
  hero: { flex: 1, justifyContent: 'center' },
  pitch: { gap: 10 },
  actions: { gap: 12 },
});
