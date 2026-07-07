import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Avatar } from '@/features/profile/avatar';
import { useIdentity } from '@/features/profile/use-identity';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';
import { shortAddress } from '@/lib/format';

/**
 * Account details — the real data behind the profile: name, email, account
 * number (copyable), verification state, and member-since. "Account number" is
 * the wallet address in zero-crypto language.
 */
export default function AccountScreen() {
  const router = useRouter();
  const theme = useTheme();
  const identity = useIdentity();
  const [copied, setCopied] = useState(false);

  const copyAccount = async () => {
    if (!identity.address) return;
    await Clipboard.setStringAsync(identity.address);
    haptics.select();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}
          style={[styles.backBtn, { backgroundColor: theme.backgroundElement }]}>
          <SymbolView name="chevron.left" size={18} tintColor={theme.text} />
        </Pressable>
        <ThemedText type="subtitle">Account</ThemedText>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.identity}>
        <Avatar initial={identity.initial} size={72} />
        <ThemedText type="subtitle" numberOfLines={1}>
          {identity.name}
        </ThemedText>
      </View>

      <Card style={styles.card}>
        <Row label="Name" value={identity.name} />
        <Divider />
        <Row label="Email" value={identity.email || '—'} />
        <Divider />
        <Pressable accessibilityRole="button" onPress={copyAccount} style={styles.row}>
          <ThemedText type="small" themeColor="textSecondary">
            Account number
          </ThemedText>
          <View style={styles.copyValue}>
            <ThemedText type="smallBold">
              {identity.address ? shortAddress(identity.address, 6, 6) : '—'}
            </ThemedText>
            <SymbolView
              name={copied ? 'checkmark' : 'doc.on.doc'}
              size={14}
              tintColor={theme.textSecondary}
            />
          </View>
        </Pressable>
        <Divider />
        <Row
          label="Identity"
          value={
            identity.isVerified ? (
              <Badge text="Verified" />
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/card-kyc')}>
                <ThemedText type="smallBold" themeColor="primary">
                  Verify now
                </ThemedText>
              </Pressable>
            )
          }
        />
        {identity.memberSince ? (
          <>
            <Divider />
            <Row label="Member since" value={identity.memberSince} />
          </>
        ) : null}
      </Card>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      {typeof value === 'string' ? <ThemedText type="smallBold">{value}</ThemedText> : value}
    </View>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <View style={styles.badge}>
      <View style={styles.badgeDot} />
      <ThemedText type="small" style={styles.badgeText}>
        {text}
      </ThemedText>
    </View>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: { alignItems: 'center', gap: 10, paddingVertical: 12 },
  card: { paddingVertical: 4, gap: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 12,
  },
  copyValue: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(132,164,95,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#84a45f' },
  badgeText: { color: '#84a45f', fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth },
});
