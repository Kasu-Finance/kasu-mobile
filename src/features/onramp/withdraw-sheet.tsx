import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { ACCENT } from '@/components/ui/theme-extras';
import { useTheme } from '@/hooks/use-theme';

import { BottomSheet } from './sheet';

type Currency = 'EUR' | 'USD';

const CURRENCY_OPTIONS: ReadonlyArray<{ key: Currency; label: string }> = [
  { key: 'EUR', label: '🇪🇺 EUR' },
  { key: 'USD', label: '🇺🇸 USD' },
];

/**
 * "Withdraw to bank" bottom sheet — the fiat off-ramp. Not wired yet (needs a
 * Wayex/Bridge session — plan W9): there is no linked bank account, so the
 * sheet explains the state and the Withdraw button stays disabled.
 */
export function WithdrawSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [amount, setAmount] = useState('');

  return (
    <BottomSheet visible={visible} title="Withdraw to bank" onClose={onClose}>
      <Segmented
        options={[...CURRENCY_OPTIONS]}
        value={currency}
        onChange={(k) => setCurrency(k as Currency)}
      />

      <ThemedText type="small" themeColor="textSecondary" style={styles.caption}>
        DESTINATION
      </ThemedText>

      <View style={[styles.bank, { backgroundColor: theme.backgroundElement }]}>
        <View style={[styles.glyphCircle, { backgroundColor: ACCENT }]}>
          <Text style={styles.glyph}>🏦</Text>
        </View>
        <View style={styles.bankText}>
          <ThemedText type="smallBold">No linked bank account</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Bank withdrawals are coming soon.
          </ThemedText>
        </View>
      </View>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          Amount ({currency})
        </ThemedText>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={theme.textSecondary}
          keyboardType="decimal-pad"
          style={[
            styles.input,
            {
              color: theme.text,
              backgroundColor: theme.backgroundElement,
              borderColor: theme.backgroundSelected,
            },
          ]}
        />
      </View>

      {/* Disabled until the Wayex off-ramp session is wired. */}
      <Button
        title="Withdraw"
        disabled
        onPress={() => {
          // TODO: wire Wayex off-ramp
        }}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  caption: { letterSpacing: 1, fontWeight: '700' },
  bank: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
  },
  glyphCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { fontSize: 18 },
  bankText: { flex: 1, gap: 2 },
  field: { gap: 6 },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: '600',
  },
});
