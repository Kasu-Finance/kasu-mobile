import { usePrivy } from '@privy-io/expo';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ACCENT } from '@/components/ui/theme-extras';
import { useTheme } from '@/hooks/use-theme';
import { shortAddress } from '@/lib/format';
import { useSdk } from '@/lib/sdk/use-sdk';
import { getChain } from '@/lib/web3/chains';
import { useViewAddress } from '@/lib/web3/use-view-address';

/**
 * Profile: identity header, wallet/KYC/chain summary, settings rows, sign out.
 *
 * Read-only / DEMO friendly — there is no logged-in Privy user, so the name and
 * email fall back to stubs and the KYC badge is shown as "Verified" for the
 * demo portfolio. The wallet address comes from `useViewAddress`.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = usePrivy();
  const { viewAddress, isDemo } = useViewAddress();
  const { chainId } = useSdk();
  const chain = getChain(chainId);

  const email =
    user?.linked_accounts?.find((a) => a.type === 'email')?.address ??
    'kiril@kasu.finance';
  const name = isDemo || !user ? 'Kiril Ivanov' : email.split('@')[0];
  const [avatarFailed, setAvatarFailed] = useState(false);
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  async function handleSignOut() {
    try {
      if (user) await logout();
    } catch {
      // Ignore — we sign out of the UI regardless.
    }
    router.replace('/(auth)/login');
  }

  return (
    <Screen>
      {/* Identity header */}
      <View style={styles.headerRow}>
        {avatarFailed ? (
          <View style={[styles.avatar, { backgroundColor: ACCENT }]}>
            <Text style={styles.avatarText}>{initials || 'U'}</Text>
          </View>
        ) : (
          <Image
            source={{ uri: 'https://github.com/kivanov82.png' }}
            style={styles.avatar}
            contentFit="cover"
            onError={() => setAvatarFailed(true)}
            accessibilityLabel={`${name} avatar`}
          />
        )}
        <View style={styles.identity}>
          <ThemedText type="subtitle" numberOfLines={1}>
            {name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {email}
          </ThemedText>
        </View>
      </View>

      {/* Account summary */}
      <Card style={styles.summaryCard}>
        <SummaryRow
          label="Wallet"
          value={viewAddress ? shortAddress(viewAddress, 8, 6) : '—'}
        />
        <Divider />
        <SummaryRow
          label="Identity (KYC)"
          value={<VerifiedBadge />}
        />
        <Divider />
        <SummaryRow label="Network" value={chain.name} />
      </Card>

      {/* Settings */}
      <View style={styles.section}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
          SETTINGS
        </ThemedText>
        <Card style={styles.settingsCard}>
          <SettingRow label="Notifications" />
          <Divider />
          <SettingRow label="Security" />
          <Divider />
          <SettingRow label="Support" />
          <Divider />
          <SettingRow label="About" />
        </Card>
      </View>

      <Button
        title="Sign out"
        variant="ghost"
        onPress={handleSignOut}
        style={styles.signOut}
      />
    </Screen>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <View style={styles.summaryRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      {typeof value === 'string' ? (
        <ThemedText type="smallBold">{value}</ThemedText>
      ) : (
        value
      )}
    </View>
  );
}

function VerifiedBadge() {
  return (
    <View style={styles.badge}>
      <View style={styles.badgeDot} />
      <Text style={styles.badgeText}>Verified</Text>
    </View>
  );
}

/** A tappable settings row with a trailing chevron. Non-functional for now. */
function SettingRow({ label }: { label: string }) {
  const theme = useTheme();
  const [hint, setHint] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => setHint(true)}
      style={styles.settingRow}>
      <ThemedText type="small">{label}</ThemedText>
      <View style={styles.settingRight}>
        {hint ? (
          <ThemedText type="small" themeColor="textSecondary">
            Coming soon
          </ThemedText>
        ) : null}
        <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
      </View>
    </Pressable>
  );
}

function Divider() {
  const theme = useTheme();
  return (
    <View
      style={[styles.divider, { backgroundColor: theme.backgroundSelected }]}
    />
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#1a1208', fontSize: 24, fontWeight: '700' },
  identity: { flex: 1, gap: 2 },

  summaryCard: { paddingVertical: 4, gap: 0 },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 12,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(63,178,127,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#3fb27f' },
  badgeText: { color: '#3fb27f', fontSize: 13, fontWeight: '700' },

  section: { gap: 8 },
  sectionLabel: { letterSpacing: 0.5, paddingHorizontal: 4 },
  settingsCard: { paddingVertical: 4, gap: 0 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chevron: { fontSize: 22, fontWeight: '400', lineHeight: 22 },

  divider: { height: StyleSheet.hairlineWidth },
  signOut: { marginTop: 8 },
});
