import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';
import { DEFAULT_CHAIN_ID, getChain } from '@/lib/web3/chains';
import { useEthersSigner } from '@/lib/web3/use-ethers-signer';

/**
 * Receive flow — surfaces the user's embedded-wallet address so a counterparty
 * can send the chain's stable asset (USDC on Base) to it.
 *
 * QR rendering is intentionally omitted: no QR library is installed in the
 * foundation and the rules forbid adding packages. The address is shown as
 * prominent, selectable text instead.
 *
 * // TODO: QR via react-native-qrcode-svg (needs `react-native-qrcode-svg` dep).
 */
export function Receive({ chainId = DEFAULT_CHAIN_ID }: { chainId?: number }) {
  const theme = useTheme();
  const { address } = useEthersSigner();
  const asset = getChain(chainId).stableAsset;
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        Share this address to receive {asset.symbol} on {getChain(chainId).name}. Only send{' '}
        {asset.symbol} to it.
      </ThemedText>

      <Card style={styles.qrPlaceholder}>
        {/* TODO: QR via react-native-qrcode-svg — render `address` as a QR here. */}
        <ThemedText type="small" themeColor="textSecondary">
          QR code unavailable
        </ThemedText>
      </Card>

      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          Your {asset.symbol} address
        </ThemedText>
        <ThemedText
          type="code"
          selectable
          style={[styles.address, { color: theme.text }]}>
          {address ?? 'No wallet found — sign in to continue.'}
        </ThemedText>
      </Card>

      <Button
        title={copied ? 'Copied' : 'Copy address'}
        onPress={handleCopy}
        disabled={!address}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  qrPlaceholder: {
    aspectRatio: 1,
    maxWidth: 220,
    alignSelf: 'center',
    width: '60%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  address: {
    fontSize: 14,
    lineHeight: 22,
  },
});
