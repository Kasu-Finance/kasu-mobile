import * as Clipboard from 'expo-clipboard';
import { ethers } from 'ethers';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ACCENT } from '@/components/ui/theme-extras';
import { useTheme } from '@/hooks/use-theme';
import { formatUnits, parseUnits, shortAddress } from '@/lib/format';
import { DEFAULT_CHAIN_ID, getChain } from '@/lib/web3/chains';
import { useStableBalance } from '@/lib/web3/use-balance';
import { useEthersSigner } from '@/lib/web3/use-ethers-signer';
import { haptics } from '@/lib/haptics';
import { refreshFinancials } from '@/lib/refresh';

import { AmountKeypad } from './amount-keypad';
import { BottomSheet } from './sheet';

const ERC20_ABI = [
  'function transfer(address,uint256) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
];
const ERROR_COLOR = '#e4645a';

type Step = 'recipient' | 'amount' | 'review' | 'sending' | 'sent' | 'error';

/** Send destination types (Plasma One's Send picker), adapted to what we support. */
const DESTINATIONS: {
  key: string;
  icon: SymbolViewProps['name'];
  label: string;
  sub: string;
}[] = [
  { key: 'bank', icon: 'building.columns.fill', label: 'Bank account', sub: 'Withdraw to your bank' },
  { key: 'username', icon: 'at', label: 'Username', sub: 'Send instantly by @username' },
];

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

  const [step, setStep] = useState<Step>('recipient');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onPaste = async () => {
    const text = (await Clipboard.getStringAsync()).trim();
    if (text) {
      setTo(text);
      haptics.select();
    }
  };

  const trimmedTo = to.trim();
  const addressValid = ethers.utils.isAddress(trimmedTo);
  const amountNum = Number(amount);
  const availableNum = balanceQuery.data
    ? Number(formatUnits(balanceQuery.data, asset.decimals))
    : 0;

  const close = () => {
    setStep('recipient');
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
      refreshFinancials();
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
      {step === 'recipient' && (
        <View style={styles.section}>
          <ThemedText type="small" themeColor="textSecondary">
            SEND TO
          </ThemedText>
          {DESTINATIONS.map((d) => (
            <View
              key={d.key}
              style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
              <View style={[styles.iconCircle, { backgroundColor: ACCENT }]}>
                <SymbolView name={d.icon} size={20} tintColor={theme.onAccent} />
              </View>
              <View style={styles.rowText}>
                <View style={styles.rowTitleRow}>
                  <ThemedText type="smallBold">{d.label}</ThemedText>
                  <View style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.badgeText}>
                      Soon
                    </ThemedText>
                  </View>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {d.sub}
                </ThemedText>
              </View>
            </View>
          ))}

          <ThemedText type="small" themeColor="textSecondary" style={styles.orLabel}>
            OR ACCOUNT NUMBER
          </ThemedText>
          <View style={styles.pasteRow}>
            <TextInput
              value={to}
              onChangeText={setTo}
              placeholder="Account number"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              style={[inputStyle, styles.pasteInput]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Paste"
              onPress={onPaste}
              style={[styles.pasteBtn, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">Paste</ThemedText>
            </Pressable>
          </View>
          <Button title="Continue" disabled={!addressValid} onPress={() => setStep('amount')} />
        </View>
      )}

      {step === 'amount' && (
        <View style={styles.section}>
          <ThemedText type="small" themeColor="textSecondary">
            To {shortAddress(trimmedTo)}
          </ThemedText>
          <AmountKeypad
            value={amount}
            onChange={setAmount}
            available={availableNum}
            onContinue={() => setStep('review')}
            error={
              amount.length > 0 && amountNum > availableNum
                ? 'Not enough funds.'
                : null
            }
          />
          <Button title="Back" variant="ghost" onPress={() => setStep('recipient')} />
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 14,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  rowTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  badgeText: { fontSize: 11 },
  orLabel: { marginTop: 4 },
  pasteRow: { flexDirection: 'row', gap: 8 },
  pasteInput: { flex: 1 },
  pasteBtn: {
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
