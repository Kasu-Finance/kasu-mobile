import { useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Share, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api/client';
import { DEFAULT_CHAIN_ID, getChain } from '@/lib/web3/chains';
import { useEthersSigner } from '@/lib/web3/use-ethers-signer';

import type { PaymentRequestBody, PaymentRequestResponse } from './types';

const ERROR_RED = '#e5484d';

type RequestState =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'created'; deepLink: string; id: string }
  | { phase: 'error'; message: string };

/**
 * Request flow — asks kasu-backend to mint a shareable payment-request deep
 * link (`POST /mobile/payments/request`). On success the link can be shared or
 * copied. The endpoint may be HTTP 501 during rollout; the error state covers
 * that.
 */
export function Request({ chainId = DEFAULT_CHAIN_ID }: { chainId?: number }) {
  const theme = useTheme();
  const { address } = useEthersSigner();
  const queryClient = useQueryClient();
  const asset = getChain(chainId).stableAsset;

  const [amount, setAmount] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [note, setNote] = useState('');
  const [state, setState] = useState<RequestState>({ phase: 'idle' });
  const [copied, setCopied] = useState(false);

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.backgroundElement },
  ];

  const amountNum = Number(amount);
  const amountValid = Number.isFinite(amountNum) && amountNum > 0;
  const busy = state.phase === 'submitting';
  const canSubmit = !!address && amountValid && !busy;

  async function handleCreate() {
    if (!address) {
      setState({ phase: 'error', message: 'No wallet available. Sign in and try again.' });
      return;
    }
    if (!amountValid) {
      setState({ phase: 'error', message: 'Enter an amount greater than zero.' });
      return;
    }

    setState({ phase: 'submitting' });
    try {
      const body: PaymentRequestBody = {
        requesterAddress: address,
        amount: amount.trim(),
        asset: asset.symbol,
        ...(payerEmail.trim() ? { payerEmail: payerEmail.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      };
      const res = await api.post<PaymentRequestResponse>('/mobile/payments/request', body);
      setState({ phase: 'created', deepLink: res.data.deepLink, id: res.data.id });
      // Refresh history so the new request appears in the recent list.
      queryClient.invalidateQueries({ queryKey: ['payment-history', address.toLowerCase()] });
    } catch {
      setState({
        phase: 'error',
        message: 'Could not create the request. The service may be unavailable — try again later.',
      });
    }
  }

  async function handleCopy(link: string) {
    await Clipboard.setStringAsync(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleShare(link: string) {
    try {
      await Share.share({
        message: `Pay me ${amount} ${asset.symbol}: ${link}`,
        url: link,
      });
    } catch {
      // User dismissed the share sheet — no-op.
    }
  }

  function reset() {
    setAmount('');
    setPayerEmail('');
    setNote('');
    setState({ phase: 'idle' });
  }

  if (state.phase === 'created') {
    return (
      <View style={styles.container}>
        <ThemedText type="small" themeColor="textSecondary">
          Request for {amount} {asset.symbol} created. Share this link to get paid.
        </ThemedText>
        <Card>
          <ThemedText type="code" selectable style={{ color: theme.text }}>
            {state.deepLink}
          </ThemedText>
        </Card>
        <Button title="Share link" onPress={() => handleShare(state.deepLink)} />
        <Button
          title={copied ? 'Copied' : 'Copy link'}
          variant="secondary"
          onPress={() => handleCopy(state.deepLink)}
        />
        <Button title="New request" variant="ghost" onPress={reset} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        Request {asset.symbol} on {getChain(chainId).name}.
      </ThemedText>

      <TextInput
        style={inputStyle}
        placeholder={`Amount (${asset.symbol})`}
        placeholderTextColor={theme.textSecondary}
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        editable={!busy}
      />
      <TextInput
        style={inputStyle}
        placeholder="Payer email (optional)"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        value={payerEmail}
        onChangeText={setPayerEmail}
        editable={!busy}
      />
      <TextInput
        style={inputStyle}
        placeholder="Note (optional)"
        placeholderTextColor={theme.textSecondary}
        value={note}
        onChangeText={setNote}
        editable={!busy}
      />

      <Button
        title={busy ? 'Creating…' : 'Create request'}
        onPress={handleCreate}
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
