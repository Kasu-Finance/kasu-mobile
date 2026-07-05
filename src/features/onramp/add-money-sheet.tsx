import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ACCENT } from '@/components/ui/theme-extras';
import { useTheme } from '@/hooks/use-theme';
import { useViewAddress } from '@/lib/web3/use-view-address';
import { haptics } from '@/lib/haptics';

import { BottomSheet } from './sheet';
import { openMoonPayBuy } from './moonpay';

/**
 * "Add funds" sheet — Plasma One-style "Add Cash": a list of funding methods
 * that drill into a detail. Zero crypto vocabulary — dollars and account
 * numbers, never wallets/USDC.
 *
 * - Bank transfer / Debit card: the fiat rails (MoonPay/Bridge, plan Phase D) —
 *   shown as "coming soon" until wired.
 * - From another account: the on-chain receive, framed as an instant transfer
 *   to the user's account number (works today).
 */
type Method = 'bank' | 'card' | 'account';

const METHODS: {
  key: Method;
  icon: SymbolViewProps['name'];
  label: string;
  sub: string;
  soon?: boolean;
}[] = [
  {
    key: 'bank',
    icon: 'building.columns.fill',
    label: 'Bank transfer',
    sub: 'Free · 1–2 business days',
    soon: true,
  },
  {
    key: 'card',
    icon: 'creditcard.fill',
    label: 'Debit card',
    sub: 'Instant · card or Apple Pay',
  },
  {
    key: 'account',
    icon: 'arrow.down.circle.fill',
    label: 'From another account',
    sub: 'Instant · your account number',
  },
];

export function AddMoneySheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Method | null>(null);

  const close = () => {
    setSelected(null);
    onClose();
  };

  const current = METHODS.find((m) => m.key === selected);
  const title = current ? current.label : 'Add funds';

  return (
    <BottomSheet visible={visible} title={title} onClose={close}>
      {selected === null ? (
        <MethodList onSelect={setSelected} />
      ) : selected === 'account' ? (
        <AccountDetail onBack={() => setSelected(null)} />
      ) : selected === 'card' ? (
        <CardTopUp onBack={() => setSelected(null)} />
      ) : (
        <ComingSoon method={current!} onBack={() => setSelected(null)} />
      )}
    </BottomSheet>
  );
}

function MethodList({ onSelect }: { onSelect: (m: Method) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.list}>
      <ThemedText type="small" themeColor="textSecondary">
        Choose how you&apos;d like to add money.
      </ThemedText>
      {METHODS.map((m) => (
        <Pressable
          key={m.key}
          accessibilityRole="button"
          onPress={() => {
            haptics.select();
            onSelect(m.key);
          }}
          style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
          <View style={[styles.iconCircle, { backgroundColor: ACCENT }]}>
            <SymbolView name={m.icon} size={20} tintColor={theme.onAccent} />
          </View>
          <View style={styles.rowText}>
            <View style={styles.rowTitleRow}>
              <ThemedText type="smallBold">{m.label}</ThemedText>
              {m.soon ? (
                <View style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.badgeText}>
                    Soon
                  </ThemedText>
                </View>
              ) : null}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {m.sub}
            </ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            ›
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

function AccountDetail({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const { viewAddress } = useViewAddress();
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (!viewAddress) return;
    await Clipboard.setStringAsync(viewAddress);
    haptics.select();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <View style={styles.section}>
      <ThemedText type="small" themeColor="textSecondary">
        Receive an instant transfer from another account or platform using your
        account number below.
      </ThemedText>

      <View
        style={[
          styles.addressBox,
          { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
        ]}>
        <ThemedText type="small" selectable style={styles.address}>
          {viewAddress ?? 'Sign in to see your account number'}
        </ThemedText>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Copy account number"
        disabled={!viewAddress}
        onPress={onCopy}
        style={[styles.copyBtn, { backgroundColor: ACCENT, opacity: viewAddress ? 1 : 0.5 }]}>
        <Text style={[styles.copyText, { color: theme.onAccent }]}>
          {copied ? 'Copied!' : 'Copy account number'}
        </Text>
      </Pressable>

      <ThemedText type="small" themeColor="textSecondary">
        Only digital-dollar transfers are supported. Ask the sender to
        double-check the account number.
      </ThemedText>

      <Pressable accessibilityRole="button" onPress={onBack} style={styles.backRow}>
        <ThemedText type="small" themeColor="textSecondary">
          ‹ Back
        </ThemedText>
      </Pressable>
    </View>
  );
}

function CardTopUp({ onBack }: { onBack: () => void }) {
  const { viewAddress } = useViewAddress();
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const launch = async () => {
    if (!viewAddress) return;
    setBusy(true);
    haptics.tap();
    const result = await openMoonPayBuy(viewAddress);
    setBusy(false);
    if (result === 'unavailable') setUnavailable(true);
  };

  return (
    <View style={styles.section}>
      <ThemedText type="small" themeColor="textSecondary">
        {unavailable
          ? 'Card top-ups are coming soon. In the meantime you can add money instantly from another account.'
          : 'Add money instantly with a debit card or Apple Pay. Payment is completed securely with our partner, MoonPay.'}
      </ThemedText>
      {!unavailable ? (
        <Button title="Add with card or Apple Pay" loading={busy} onPress={launch} />
      ) : null}
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.backRow}>
        <ThemedText type="small" themeColor="textSecondary">
          ‹ Back
        </ThemedText>
      </Pressable>
    </View>
  );
}

function ComingSoon({
  method,
  onBack,
}: {
  method: { label: string };
  onBack: () => void;
}) {
  return (
    <View style={styles.section}>
      <ThemedText type="small" themeColor="textSecondary">
        {method.label} is coming soon. In the meantime you can add money
        instantly from another account — go back and choose “From another
        account”.
      </ThemedText>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.backRow}>
        <ThemedText type="small" themeColor="textSecondary">
          ‹ Back
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
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
  backRow: { paddingVertical: 4 },
});
