import * as Clipboard from 'expo-clipboard';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';
import { refreshFinancials } from '@/lib/refresh';
import { recordTransfer } from '@/features/activity/transfers-store';
import { formatUnits, formatUsd, shortAddress } from '@/lib/format';
import { DEFAULT_CHAIN_ID } from '@/lib/web3/chains';
import { useStableBalance } from '@/lib/web3/use-balance';
import { useViewAddress } from '@/lib/web3/use-view-address';

/**
 * Deposit screen — receive a transfer to your account number (Plasma One's
 * "Deposit" screen, zero-crypto framing). A QR of the account number, copy /
 * share, and a live watch that flips to "received" when the balance rises.
 * Base only for now.
 */
export default function DepositRoute() {
  const theme = useTheme();
  const router = useRouter();
  const { viewAddress } = useViewAddress();
  const balanceQuery = useStableBalance(viewAddress, DEFAULT_CHAIN_ID);
  const [copied, setCopied] = useState(false);
  const [received, setReceived] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState<string | null>(null);

  // Watch for an incoming transfer: poll the balance; celebrate when it rises
  // above what it was when the screen opened.
  const baseline = useRef<string | null>(null);
  useEffect(() => {
    const b = balanceQuery.data;
    if (b == null) return;
    if (baseline.current === null) {
      baseline.current = b;
      return;
    }
    if (!received && BigInt(b) > BigInt(baseline.current)) {
      const delta = BigInt(b) - BigInt(baseline.current);
      const dollars = formatUnits(delta.toString(), 6);
      setReceivedAmount(formatUsd(dollars));
      setReceived(true);
      haptics.success();
      if (viewAddress) {
        void recordTransfer(viewAddress, { kind: 'received', amount: dollars });
      }
      // Funds arrived — reload balance, portfolio, card, activity everywhere.
      refreshFinancials();
    }
  }, [balanceQuery.data, received, viewAddress]);

  useEffect(() => {
    const t = setInterval(() => void balanceQuery.refetch(), 8000);
    return () => clearInterval(t);
  }, [balanceQuery]);

  const onCopy = async () => {
    if (!viewAddress) return;
    await Clipboard.setStringAsync(viewAddress);
    haptics.select();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const onShare = async () => {
    if (!viewAddress) return;
    haptics.tap();
    await Share.share({ message: viewAddress }).catch(() => {});
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <ThemedText type="subtitle">Add money</ThemedText>
        <Button
          title="Close"
          variant="ghost"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={styles.close}
        />
      </View>

      {received ? (
        <View style={styles.successBody}>
          <View style={[styles.successCircle, { backgroundColor: theme.primary }]}>
            <ThemedText style={[styles.successCheck, { color: theme.onAccent }]}>
              ✓
            </ThemedText>
          </View>
          <ThemedText type="title" style={styles.center}>
            {receivedAmount ?? ''}
          </ThemedText>
          <ThemedText type="subtitle" style={styles.center}>
            Money received
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            It’s in your balance now.
          </ThemedText>
          <Button
            title="Done"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
            style={styles.doneBtn}
          />
        </View>
      ) : (
      <View style={styles.body}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Send money to this account number and it’ll appear in your balance
          automatically.
        </ThemedText>

        <View style={styles.qrWrap}>
          <View style={styles.qrCard}>
            {viewAddress ? (
              <QRCode
                value={viewAddress}
                size={200}
                color="#1f1f24"
                backgroundColor="#ffffff"
                ecl="H"
                logo={require('../../assets/brand/mark-brass.png')}
                logoSize={44}
                logoBackgroundColor="#ffffff"
                logoMargin={4}
                logoBorderRadius={8}
              />
            ) : (
              <ThemedText type="small">Sign in to see your account number</ThemedText>
            )}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Copy account number"
          onPress={onCopy}
          style={styles.addressRow}>
          <ThemedText type="smallBold">{shortAddress(viewAddress, 8, 6)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {copied ? '✓ Copied' : 'Tap to copy'}
          </ThemedText>
        </Pressable>

        <Card style={styles.info}>
          <Row label="Network" value="Base" />
          <Row label="Fee" value="Free" />
          <Row label="Arrives" value="~1 minute" />
        </Card>

        <View style={styles.actions}>
          <Button title="Share" variant="secondary" onPress={onShare} style={styles.actionBtn} />
          <Button title={copied ? 'Copied!' : 'Copy'} onPress={onCopy} style={styles.actionBtn} />
        </View>
      </View>
      )}
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="small">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  close: { paddingHorizontal: 0 },
  body: { flex: 1, padding: 20, gap: 20 },
  center: { textAlign: 'center' },
  successBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successCheck: { fontSize: 52, lineHeight: 58, fontWeight: '700' },
  doneBtn: { alignSelf: 'stretch', marginTop: 20 },
  qrWrap: { alignItems: 'center' },
  qrCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 20,
  },
  addressRow: { alignItems: 'center', gap: 2 },
  info: { gap: 10 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actions: { flexDirection: 'row', gap: 12, marginTop: 'auto' },
  actionBtn: { flex: 1 },
});
