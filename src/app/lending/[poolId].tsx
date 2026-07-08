import type { StrategyTranche } from '@kasufinance/kasu-sdk';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HelpButton } from '@/components/ui/help-button';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { LendAmount, StrategyDetails, StrategyHelpContent, useStrategy } from '@/features/lending';

type Step =
  | { kind: 'details' }
  | { kind: 'amount'; tranche: StrategyTranche };

/**
 * Strategy detail route: `/lending/<poolId>`.
 *
 * Overview (`StrategyDetails`) → tap an Option → amount screen (`LendAmount`).
 * The header is a circular back + a "?" holding the key-data table + About copy
 * ({@link StrategyHelpContent}). Backing out of the amount step returns to the
 * overview; backing out of the overview pops the route.
 */
export default function StrategyDetailRoute() {
  const { poolId } = useLocalSearchParams<{ poolId: string }>();
  const router = useRouter();
  const { data: strategy, isLoading, isError } = useStrategy(poolId);
  const [step, setStep] = useState<Step>({ kind: 'details' });

  const popRoute = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/earn');
  };
  const onBack = step.kind === 'amount' ? () => setStep({ kind: 'details' }) : popRoute;

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        onBack={onBack}
        title={step.kind === 'amount' ? 'Lend' : undefined}
        right={
          strategy && step.kind === 'details' ? (
            <HelpButton title={strategy.name}>
              <StrategyHelpContent strategy={strategy} />
            </HelpButton>
          ) : undefined
        }
      />

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
          <Button title="Back to strategies" onPress={popRoute} />
        </Card>
      )}

      {strategy && step.kind === 'details' && (
        <StrategyDetails
          strategy={strategy}
          onSelectOption={(tranche) => setStep({ kind: 'amount', tranche })}
        />
      )}

      {strategy && step.kind === 'amount' && (
        <LendAmount strategy={strategy} tranche={step.tranche} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 12 },
  center: { paddingVertical: 32, alignItems: 'center' },
});
