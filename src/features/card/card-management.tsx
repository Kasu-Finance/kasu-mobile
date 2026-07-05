import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';
import { formatUnits, formatUsd } from '@/lib/format';

import { useCardTopup } from './use-card-topup';
import { useCardTransactions } from './use-card-transactions';
import { useSimulatePurchase } from './use-card-demo';
import { useSpendingLimit } from './card-prefs';

const ERROR_COLOR = '#e4645a';

/**
 * Card management panel — shown on Home when the card is flipped to reveal its
 * details. Card balance, top up, and the card's recent purchases. Kept flat
 * (no card visual — the flipped hero card above IS the visual).
 */
export function CardManagement({
  address,
  balance,
}: {
  address: string;
  balance: string | null;
}) {
  const theme = useTheme();
  const topup = useCardTopup();
  const simulate = useSimulatePurchase();
  const cardTx = useCardTransactions(address);
  const spendingLimit = useSpendingLimit(address);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const cardBalance = balance ? formatUsd(formatUnits(balance, 6)) : '$0.00';
  const trimmed = amount.trim();
  const amountValid = Number(trimmed) > 0;

  const handleTopup = async () => {
    setError(null);
    if (!amountValid) {
      setError('Enter an amount greater than zero.');
      return;
    }
    try {
      await topup.mutateAsync({ userAddress: address, amount: trimmed });
      setAmount('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error.');
    }
  };

  const transactions = cardTx.data ?? [];

  return (
    <View style={styles.gap}>
      <View style={styles.balanceRow}>
        <ThemedText type="small" themeColor="textSecondary">
          ON YOUR CARD
        </ThemedText>
        <ThemedText type="subtitle">{cardBalance}</ThemedText>
        {spendingLimit.data ? (
          <ThemedText type="small" themeColor="textSecondary">
            Monthly limit ${spendingLimit.data}
          </ThemedText>
        ) : null}
      </View>

      <Card style={styles.gap}>
        <ThemedText type="smallBold">Top up</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Move money from your balance onto your card.
        </ThemedText>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={theme.textSecondary}
          keyboardType="decimal-pad"
          inputMode="decimal"
          style={[
            styles.input,
            { backgroundColor: theme.backgroundElement, color: theme.text },
          ]}
        />
        {error ? (
          <ThemedText type="small" style={{ color: ERROR_COLOR }}>
            {error}
          </ThemedText>
        ) : null}
        <Button
          title="Top up card"
          loading={topup.isPending}
          disabled={!amountValid}
          onPress={handleTopup}
        />
      </Card>

      <View style={styles.section}>
        <ThemedText type="smallBold">Card activity</ThemedText>
        {transactions.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No card purchases yet.
          </ThemedText>
        ) : (
          <Card style={styles.feed}>
            {transactions.slice(0, 8).map((t, i) => (
              <View
                key={t.id}
                style={[
                  styles.txRow,
                  i > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: theme.backgroundSelected,
                  },
                ]}>
                <ThemedText type="small">{t.merchantName ?? 'Purchase'}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  -{formatUsd(Number(t.amount ?? '0'))}
                </ThemedText>
              </View>
            ))}
          </Card>
        )}
      </View>

      <Button
        title="Add a sample purchase"
        variant="ghost"
        loading={simulate.isPending}
        onPress={() => simulate.mutate(address)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 12 },
  balanceRow: { gap: 2 },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  section: { gap: 8 },
  feed: { paddingVertical: 4 },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
});
