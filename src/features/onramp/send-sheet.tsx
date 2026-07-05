import { ethers } from 'ethers';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { formatUnits, parseUnits, shortAddress } from '@/lib/format';
import { DEFAULT_CHAIN_ID, getChain } from '@/lib/web3/chains';
import { useStableBalance } from '@/lib/web3/use-balance';
import { useEthersSigner } from '@/lib/web3/use-ethers-signer';
import { haptics } from '@/lib/haptics';

import { BottomSheet } from './sheet';

const ERC20_ABI = [
  'function transfer(address,uint256) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
];
const ERROR_COLOR = '#e4645a';

type Step = 'to' | 'amount' | 'review' | 'sending' | 'sent' | 'error';

/**
 * "Send" sheet — Plasma One-style multi-step P2P: To → Amount → Review → Sent.
 * Zero crypto vocabulary (account number, dollars). Under the hood it's a
 * gasless USDC transfer on Base from the embedded wallet (gas sponsored by the
 * Privy paymaster policy, so it's free + instant for the user).
 */
export function SendSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { signer, address } = useEthersSigner();
  const asset = getChain(DEFAULT_CHAIN_ID).stableAsset;
  const balanceQuery = useStableBalance(address, DEFAULT_CHAIN_ID);

  const [step, setStep] = useState<Step>('to');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const trimmedTo = to.trim();
  const addressValid = ethers.utils.isAddress(trimmedTo);
  const amountNum = Number(amount);
  const availableNum = balanceQuery.data
    ? Number(formatUnits(balanceQuery.data, asset.decimals))
    : 0;
  const amountValid =
    Number.isFinite(amountNum) && amountNum > 0 && amountNum <= availableNum;
  const available = balanceQuery.data
    ? `$${formatUnits(balanceQuery.data, asset.decimals)}`
    : '$0.00';

  const close = () => {
    setStep('to');
    setTo('');
    setAmount('');
    setError(null);
    onClose();
  };

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
  ];

  async function send() {
    if (!signer || !address) {
      setError('Please sign in and try again.');
      setStep('error');
      return;
    }
    setStep('sending');
    try {
      const usdc = new ethers.Contract(asset.address, ERC20_ABI, signer);
      const value = parseUnits(amount, asset.decimals);
      const balance: ethers.BigNumber = await usdc.balanceOf(address);
      if (balance.lt(value)) {
        setError(`Not enough funds. You have $${formatUnits(balance, asset.decimals)}.`);
        setStep('error');
        return;
      }
      const tx = await usdc.transfer(trimmedTo, value);
      await tx.wait();
      haptics.success();
      setStep('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setStep('error');
    }
  }

  const title =
    step === 'sent' ? 'Sent' : step === 'review' ? 'Review' : 'Send money';

  return (
    <BottomSheet visible={visible} title={title} onClose={close}>
      {step === 'to' && (
        <View style={styles.section}>
          <ThemedText type="small" themeColor="textSecondary">
            Enter the account number you want to send money to.
          </ThemedText>
          <TextInput
            value={to}
            onChangeText={setTo}
            placeholder="Account number"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            style={inputStyle}
          />
          <Button
            title="Continue"
            disabled={!addressValid}
            onPress={() => setStep('amount')}
          />
        </View>
      )}

      {step === 'amount' && (
        <View style={styles.section}>
          <ThemedText type="small" themeColor="textSecondary">
            To {shortAddress(trimmedTo)} · Available {available}
          </ThemedText>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={theme.textSecondary}
            keyboardType="decimal-pad"
            inputMode="decimal"
            style={[inputStyle, styles.amountInput]}
            autoFocus
          />
          {amount.length > 0 && !amountValid ? (
            <ThemedText type="small" style={{ color: ERROR_COLOR }}>
              {amountNum > availableNum ? 'Not enough funds.' : 'Enter an amount greater than zero.'}
            </ThemedText>
          ) : null}
          <Button title="Continue" disabled={!amountValid} onPress={() => setStep('review')} />
          <Button title="Back" variant="ghost" onPress={() => setStep('to')} />
        </View>
      )}

      {step === 'review' && (
        <View style={styles.section}>
          <View style={styles.reviewAmount}>
            <ThemedText type="title">${amount}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              to {shortAddress(trimmedTo)}
            </ThemedText>
          </View>
          <View style={[styles.reviewRow, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small" themeColor="textSecondary">
              Fee
            </ThemedText>
            <ThemedText type="small">Free · arrives instantly</ThemedText>
          </View>
          <Button title={`Send $${amount}`} onPress={send} />
          <Button title="Back" variant="ghost" onPress={() => setStep('amount')} />
        </View>
      )}

      {step === 'sending' && (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} />
          <ThemedText type="small" themeColor="textSecondary">
            Sending…
          </ThemedText>
        </View>
      )}

      {step === 'sent' && (
        <View style={styles.section}>
          <ThemedText type="subtitle">${amount} sent</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Your money is on its way to {shortAddress(trimmedTo)}.
          </ThemedText>
          <Button title="Done" onPress={close} />
        </View>
      )}

      {step === 'error' && (
        <View style={styles.section}>
          <ThemedText type="small" style={{ color: ERROR_COLOR }}>
            {error}
          </ThemedText>
          <Button title="Try again" onPress={() => setStep('review')} />
          <Button title="Close" variant="ghost" onPress={close} />
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  amountInput: { fontSize: 22, fontVariant: ['tabular-nums'] },
  reviewAmount: { alignItems: 'center', gap: 4, paddingVertical: 8 },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
  },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 32 },
});
