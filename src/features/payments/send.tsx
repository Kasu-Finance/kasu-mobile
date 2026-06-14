import { ethers } from 'ethers';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { formatUnits, parseUnits, shortAddress } from '@/lib/format';
import { DEFAULT_CHAIN_ID, getChain } from '@/lib/web3/chains';
import { useEthersSigner } from '@/lib/web3/use-ethers-signer';

const ERC20_ABI = [
  'function transfer(address,uint256) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
];

type SendState =
  | { phase: 'idle' }
  | { phase: 'pending' }
  | { phase: 'confirmed'; txHash: string }
  | { phase: 'error'; message: string };

const ERROR_RED = '#e4645a';
const OK_GREEN = '#30a46c';

/**
 * Send flow — a direct ERC20 `transfer` of the chain's stable asset (USDC on
 * Base) from the user's embedded wallet to a recipient address.
 *
 * Validates the recipient address and that the amount is positive and within
 * the wallet balance, then shows pending → confirmed (tx hash) → error states.
 *
 * // TODO: sending to an email (resolve to address server-side) is out of scope
 * //       for v1 — accept an on-chain address only.
 */
export function Send({ chainId = DEFAULT_CHAIN_ID }: { chainId?: number }) {
  const theme = useTheme();
  const { signer, address } = useEthersSigner();
  const asset = getChain(chainId).stableAsset;

  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [state, setState] = useState<SendState>({ phase: 'idle' });

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.backgroundElement },
  ];

  const trimmedTo = to.trim();
  const addressValid = ethers.utils.isAddress(trimmedTo);
  const amountNum = Number(amount);
  const amountValid = Number.isFinite(amountNum) && amountNum > 0;
  const busy = state.phase === 'pending';
  const canSubmit = !!signer && addressValid && amountValid && !busy;

  async function handleSend() {
    if (!signer || !address) {
      setState({ phase: 'error', message: 'No wallet available. Sign in and try again.' });
      return;
    }
    if (!addressValid) {
      setState({ phase: 'error', message: 'Enter a valid recipient address.' });
      return;
    }
    if (!amountValid) {
      setState({ phase: 'error', message: 'Enter an amount greater than zero.' });
      return;
    }

    setState({ phase: 'pending' });
    try {
      const usdc = new ethers.Contract(asset.address, ERC20_ABI, signer);

      // Balance guard — exact-unit comparison in base units.
      const value = parseUnits(amount, asset.decimals);
      const balance: ethers.BigNumber = await usdc.balanceOf(address);
      if (balance.lt(value)) {
        setState({
          phase: 'error',
          message: `Insufficient balance. You have ${formatUnits(balance, asset.decimals)} ${asset.symbol}.`,
        });
        return;
      }

      const tx = await usdc.transfer(trimmedTo, value);
      await tx.wait();
      setState({ phase: 'confirmed', txHash: tx.hash });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Transfer failed. Please try again.';
      setState({ phase: 'error', message });
    }
  }

  function reset() {
    setTo('');
    setAmount('');
    setState({ phase: 'idle' });
  }

  if (state.phase === 'confirmed') {
    return (
      <View style={styles.container}>
        <ThemedText type="small" style={{ color: OK_GREEN }}>
          Sent {amount} {asset.symbol} to {shortAddress(trimmedTo)}.
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Transaction hash
        </ThemedText>
        <ThemedText type="code" selectable style={{ color: theme.text }}>
          {state.txHash}
        </ThemedText>
        <Button title="Send another" onPress={reset} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        Send {asset.symbol} on {getChain(chainId).name}.
      </ThemedText>

      <TextInput
        style={inputStyle}
        placeholder="Recipient address (0x…)"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        value={to}
        onChangeText={setTo}
        editable={!busy}
      />
      {trimmedTo.length > 0 && !addressValid ? (
        <ThemedText type="small" style={{ color: ERROR_RED }}>
          That doesn&apos;t look like a valid address.
        </ThemedText>
      ) : null}

      <TextInput
        style={inputStyle}
        placeholder={`Amount (${asset.symbol})`}
        placeholderTextColor={theme.textSecondary}
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        editable={!busy}
      />

      <Button
        title={busy ? 'Sending…' : `Send ${asset.symbol}`}
        onPress={handleSend}
        loading={busy}
        disabled={!canSubmit}
      />

      {state.phase === 'error' ? (
        <ThemedText type="small" style={{ color: ERROR_RED }}>
          {state.message}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
  },
});
