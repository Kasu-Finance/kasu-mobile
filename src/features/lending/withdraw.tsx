import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';
import { useSdk } from '@/lib/sdk/use-sdk';
import { getChain } from '@/lib/web3/chains';

// DEMO: KYC is stubbed out for the read-only demo build. Swap back to
// `@/features/kyc`'s `KycGate` for live use.
import { DemoKycGate as KycGate } from './lib/demo-kyc-gate';
import { useWithdraw } from './use-withdraw';

export interface WithdrawProps {
  poolId: string;
  trancheId: string;
  poolName?: string;
  onClose: () => void;
}

/**
 * Withdraw flow. KYC-gated (the on-chain call verifies a Nexera signature).
 * Supports an exact amount or "max" (full balance) via the dedicated facade
 * method. Like deposits, withdrawals settle at the next weekly epoch.
 */
export function Withdraw({ poolId, trancheId, poolName, onClose }: WithdrawProps) {
  const theme = useTheme();
  const { chainId } = useSdk();
  const stable = getChain(chainId).stableAsset;
  const withdraw = useWithdraw();

  const [amount, setAmount] = useState('');
  const [useMax, setUseMax] = useState(false);

  if (withdraw.isSuccess) {
    return (
      <View style={styles.gap}>
        <ThemedText type="smallBold">Withdrawal requested</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Your withdrawal request has been submitted and will settle at the next weekly epoch.
        </ThemedText>
        <Button title="Done" onPress={onClose} />
      </View>
    );
  }

  const canSubmit = useMax || (!!amount && Number(amount) > 0);

  const submit = () => {
    withdraw.mutate({
      poolId,
      trancheId,
      amount: useMax ? 'max' : amount,
    });
  };

  return (
    <KycGate>
      <View style={styles.gap}>
        <ThemedText type="smallBold">Withdraw{poolName ? ` · ${poolName}` : ''}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Request a withdrawal of your {stable.symbol} position. Settles at the next weekly epoch.
        </ThemedText>

        <Card style={styles.gapSmall}>
          <View style={styles.rowBetween}>
            <ThemedText type="small" themeColor="textSecondary">
              Amount ({stable.symbol})
            </ThemedText>
            <Pressable accessibilityRole="button" onPress={() => setUseMax((v) => !v)}>
              <ThemedText type="link" themeColor="text">
                {useMax ? 'Enter amount' : 'Withdraw max'}
              </ThemedText>
            </Pressable>
          </View>
          {useMax ? (
            <ThemedText type="default">Max (full balance)</ThemedText>
          ) : (
            <TextInput
              value={amount}
              onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
              placeholder="0.00"
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
              style={[styles.input, { color: theme.text }]}
            />
          )}
        </Card>

        {withdraw.isError && (
          <ThemedText type="small" style={styles.error}>
            {withdraw.error.message}
          </ThemedText>
        )}

        <Button
          title="Request withdrawal"
          disabled={!canSubmit}
          loading={withdraw.isPending}
          onPress={submit}
        />
        <Button title="Cancel" variant="ghost" onPress={onClose} disabled={withdraw.isPending} />
      </View>
    </KycGate>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 12 },
  gapSmall: { gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: { fontSize: 28, fontWeight: '600', paddingVertical: 4 },
  error: { color: '#d4534e' },
});
