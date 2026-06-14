import { useState, type ReactNode } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Segmented } from '@/components/ui/segmented';
import { ACCENT } from '@/components/ui/theme-extras';
import { UsdcMark } from '@/components/ui/usdc-mark';
import { useTheme } from '@/hooks/use-theme';
import { useViewAddress } from '@/lib/web3/use-view-address';

import { DEMO_FUNDING_DETAILS } from './demo-bank';
import { BottomSheet, ReadOnlyField } from './sheet';

/**
 * "Add money" bottom sheet.
 *
 * A single EUR / USD / USDC selector drives the funding method:
 * - **EUR / USD** — a Wayex fiat bank transfer; shows the IBAN / BIC / reference
 *   to wire to (STUBBED with `DEMO_FUNDING_DETAILS` until a Wayex session exists).
 * - **USDC** — not a Wayex rail; just an on-chain (Base) transfer to the user's
 *   own wallet address, with a copy button.
 *
 * TODO: wire Wayex — replace the stub bank details with a real
 * `POST /wayex/deposit-fiat` response once a backend session exists.
 */
type Method = 'EUR' | 'USD' | 'USDC';

const METHOD_OPTIONS: { key: Method; label: string; icon: ReactNode }[] = [
  { key: 'EUR', label: 'EUR', icon: <Text style={{ fontSize: 15 }}>🇪🇺</Text> },
  { key: 'USD', label: 'USD', icon: <Text style={{ fontSize: 15 }}>🇺🇸</Text> },
  { key: 'USDC', label: 'USDC', icon: <UsdcMark size={16} /> },
];

export function AddMoneySheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { viewAddress } = useViewAddress();
  const [method, setMethod] = useState<Method>('EUR');
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (!viewAddress) return;
    await Clipboard.setStringAsync(viewAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isUsdc = method === 'USDC';

  return (
    <BottomSheet visible={visible} title="Add money" onClose={onClose}>
      <Segmented
        options={[...METHOD_OPTIONS]}
        value={method}
        onChange={(k) => setMethod(k as Method)}
      />

      {isUsdc ? (
        /* On-chain (Base) — send USDC to your own wallet address. */
        <View style={styles.section}>
          <ThemedText type="smallBold">USDC on Base</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Send USDC on the Base network to your wallet address below.
          </ThemedText>

          <View
            style={[
              styles.addressBox,
              { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
            ]}>
            <ThemedText type="small" selectable style={styles.address}>
              {viewAddress ?? 'No wallet connected'}
            </ThemedText>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Copy wallet address"
            disabled={!viewAddress}
            onPress={onCopy}
            style={[styles.copyBtn, { backgroundColor: ACCENT, opacity: viewAddress ? 1 : 0.5 }]}>
            <Text style={[styles.copyText, { color: theme.onAccent }]}>
              {copied ? 'Copied!' : 'Copy address'}
            </Text>
          </Pressable>

          <ThemedText type="small" themeColor="textSecondary">
            Only send USDC on Base. Other networks or assets may be lost.
          </ThemedText>
        </View>
      ) : (
        /* Fiat bank transfer (EUR / USD). */
        <View style={styles.section}>
          <ThemedText type="smallBold">Bank transfer</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Send {method} to the account below, including the reference.
          </ThemedText>

          <ReadOnlyField label="IBAN" value={DEMO_FUNDING_DETAILS.iban} />
          <ReadOnlyField label="BIC" value={DEMO_FUNDING_DETAILS.bic} />
          <ReadOnlyField label="Reference" value={DEMO_FUNDING_DETAILS.reference} />
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  addressBox: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  address: { fontVariant: ['tabular-nums'] },
  copyBtn: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyText: { fontSize: 15, fontWeight: '700' },
});
