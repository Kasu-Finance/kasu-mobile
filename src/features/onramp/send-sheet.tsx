import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';

import { BottomSheet } from './sheet';

/**
 * "Send" bottom sheet — STUB. Sending on-chain USDC from the demo address is not
 * possible (no signer in read-only demo mode), so the action is disabled.
 *
 * TODO: wire on-chain transfer once a connected signer exists.
 */
export function SendSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');

  return (
    <BottomSheet visible={visible} title="Send" onClose={onClose}>
      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          Recipient address
        </ThemedText>
        <TextInput
          value={to}
          onChangeText={setTo}
          placeholder="0x…"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          style={[styles.input, inputColors(theme)]}
        />
      </View>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          Amount (USDC)
        </ThemedText>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={theme.textSecondary}
          keyboardType="decimal-pad"
          style={[styles.input, inputColors(theme)]}
        />
      </View>

      <Button
        title="Send"
        disabled
        onPress={() => {
          // TODO: wire on-chain transfer
        }}
      />
    </BottomSheet>
  );
}

function inputColors(theme: ReturnType<typeof useTheme>) {
  return {
    color: theme.text,
    backgroundColor: theme.backgroundElement,
    borderColor: theme.backgroundSelected,
  };
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
});
