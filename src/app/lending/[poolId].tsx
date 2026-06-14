import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { DepositFlow, StrategyDetails, useStrategy } from '@/features/lending';

type Step = 'details' | 'deposit';

/**
 * Strategy detail route: `/lending/<poolId>`.
 *
 * First shows a rich, read-only detail view (`StrategyDetails`) — name, status,
 * APY, TVL, capacity, a tranche breakdown, and a description. Tapping "Lend"
 * advances to the stepped `DepositFlow`. Backing out of the deposit returns to
 * the details; backing out of the details pops the route.
 */
export default function StrategyDetailRoute() {
  const { poolId } = useLocalSearchParams<{ poolId: string }>();
  const router = useRouter();
  const { data: strategy, isLoading, isError } = useStrategy(poolId);
  const [step, setStep] = useState<Step>('details');

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/lending');
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <ThemedText type="subtitle">{step === 'deposit' ? 'Deposit' : 'Strategy'}</ThemedText>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      )}

      {(isError || (!isLoading && !strategy)) && (
        <Card style={styles.gap}>
          <ThemedText type="smallBold">Strategy not found</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            This strategy may no longer be available on the current network.
          </ThemedText>
          <Button title="Back to strategies" onPress={goBack} />
        </Card>
      )}

      {strategy && step === 'details' && (
        <StrategyDetails
          strategy={strategy}
          onLend={() => setStep('deposit')}
          onBack={goBack}
        />
      )}

      {strategy && step === 'deposit' && (
        <DepositFlow strategy={strategy} onClose={() => setStep('details')} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 12 },
  center: { paddingVertical: 32, alignItems: 'center' },
});
