import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { ACCENT } from '@/components/ui/theme-extras';
import { useTheme } from '@/hooks/use-theme';

import { CURRENCY_OPTIONS, DEMO_LINKED_BANK, type Currency } from './demo-bank';
import { BottomSheet } from './sheet';

/**
 * "Withdraw to bank" bottom sheet — the Wayex off-ramp, STUBBED for demo mode.
 *
 * EUR/USD toggle + a single pre-linked (stub) bank + an amount field. The
 * Withdraw button is disabled (no backend session in demo).
 *
 * TODO: wire Wayex off-ramp — `POST /wayex/deposit-crypto` route does not exist
 * yet (see `off-ramp.tsx`). Keep the button disabled until both land.
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
          <ThemedText type="smallBold">
            {DEMO_LINKED_BANK.bankName} · {DEMO_LINKED_BANK.accountHolder}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {DEMO_LINKED_BANK.iban}
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

      {/* Disabled in demo — no backend off-ramp session. */}
      <Button
        title="Withdraw"
        disabled
        onPress={() => {
          // TODO: wire Wayex off-ramp
        }}
      />
      <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
        Withdrawals are disabled in demo mode.
      </ThemedText>
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
  note: { textAlign: 'center' },
});
