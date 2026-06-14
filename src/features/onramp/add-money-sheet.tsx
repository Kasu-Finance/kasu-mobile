import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Segmented } from '@/components/ui/segmented';
import { ACCENT } from '@/components/ui/theme-extras';
import { useTheme } from '@/hooks/use-theme';
import { useViewAddress } from '@/lib/web3/use-view-address';

import { CURRENCY_OPTIONS, DEMO_FUNDING_DETAILS, type Currency } from './demo-bank';
import { BottomSheet, ReadOnlyField } from './sheet';

/**
 * "Add money" bottom sheet — the Wayex top-up, STUBBED for demo mode.
 *
 * EUR/USD toggle + three funding options. "SEPA bank transfer" expands to show
 * read-only stub bank details; "Debit card" is greyed/disabled ("Coming soon");
 * "USDC" expands to reveal the user's wallet address with a copy button for an
 * on-chain (Base) deposit.
 *
 * TODO: wire Wayex — replace the stub `DEMO_FUNDING_DETAILS` with a real
 * `POST /wayex/deposit-fiat` response once a backend session exists.
 */
export function AddMoneySheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { viewAddress } = useViewAddress();
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [showDetails, setShowDetails] = useState(false);
  const [showUsdc, setShowUsdc] = useState(false);
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (!viewAddress) return;
    await Clipboard.setStringAsync(viewAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <BottomSheet visible={visible} title="Add money" onClose={onClose}>
      <Segmented
        options={[...CURRENCY_OPTIONS]}
        value={currency}
        onChange={(k) => setCurrency(k as Currency)}
      />

      <ThemedText type="small" themeColor="textSecondary" style={styles.caption}>
        HOW WOULD YOU LIKE TO ADD MONEY?
      </ThemedText>

      {/* (a) SEPA bank transfer — expands to stub bank details. */}
      <Pressable
        accessibilityRole="button"
        onPress={() => setShowDetails((v) => !v)}
        style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
        <View style={[styles.glyphCircle, { backgroundColor: ACCENT }]}>
          <Text style={styles.glyph}>🏦</Text>
        </View>
        <View style={styles.rowText}>
          <ThemedText type="smallBold">SEPA bank transfer</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Get EU bank details to fund with {currency}
          </ThemedText>
        </View>
        <Text style={[styles.chevron, { color: theme.textSecondary }]}>
          {showDetails ? '⌄' : '›'}
        </Text>
      </Pressable>

      {showDetails && (
        <View style={styles.details}>
          <ReadOnlyField label="IBAN" value={DEMO_FUNDING_DETAILS.iban} />
          <ReadOnlyField label="BIC" value={DEMO_FUNDING_DETAILS.bic} />
          <ReadOnlyField label="Reference" value={DEMO_FUNDING_DETAILS.reference} />
          <ThemedText type="small" themeColor="textSecondary">
            Send {currency} to these details. Demo only — no live transfer.
          </ThemedText>
        </View>
      )}

      {/* (b) Debit card — disabled, "Coming soon". */}
      <View
        style={[
          styles.row,
          { backgroundColor: theme.backgroundElement, opacity: 0.5 },
        ]}>
        <View style={[styles.glyphCircle, { backgroundColor: theme.backgroundSelected }]}>
          <Text style={styles.glyph}>💳</Text>
        </View>
        <View style={styles.rowText}>
          <ThemedText type="smallBold">Debit card</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Coming soon
          </ThemedText>
        </View>
      </View>

      {/* (c) USDC — expands to reveal the user's wallet address + copy. */}
      <Pressable
        accessibilityRole="button"
        onPress={() => setShowUsdc((v) => !v)}
        style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
        <View style={[styles.glyphCircle, { backgroundColor: ACCENT }]}>
          <Text style={styles.glyph}>💵</Text>
        </View>
        <View style={styles.rowText}>
          <ThemedText type="smallBold">USDC</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Deposit USDC directly to your wallet (Base)
          </ThemedText>
        </View>
        <Text style={[styles.chevron, { color: theme.textSecondary }]}>
          {showUsdc ? '⌄' : '›'}
        </Text>
      </Pressable>

      {showUsdc && (
        <View style={styles.details}>
          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              Your wallet address
            </ThemedText>
            <View
              style={[
                styles.addressBox,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
              ]}>
              <ThemedText
                type="small"
                selectable
                style={styles.address}>
                {viewAddress ?? 'No wallet connected'}
              </ThemedText>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Copy wallet address"
            disabled={!viewAddress}
            onPress={onCopy}
            style={[
              styles.copyBtn,
              { backgroundColor: ACCENT, opacity: viewAddress ? 1 : 0.5 },
            ]}>
            <Text style={styles.copyText}>{copied ? 'Copied!' : 'Copy address'}</Text>
          </Pressable>
          <ThemedText type="small" themeColor="textSecondary">
            Send USDC on Base to this address. Other networks or assets may be lost.
          </ThemedText>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  caption: { letterSpacing: 1, fontWeight: '700' },
  row: {
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
  rowText: { flex: 1, gap: 2 },
  chevron: { fontSize: 22, fontWeight: '600' },
  details: { gap: 10 },
  field: { gap: 6 },
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
  copyText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
