import { usePrivy } from '@privy-io/expo';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ACCENT } from '@/components/ui/theme-extras';
import { useIdentity } from '@/features/profile/use-identity';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';
import { shortAddress } from '@/lib/format';

const SUPPORT_EMAIL = 'hello@kasu.finance';
const TERMS_URL =
  'https://docs.kasu.finance/legal-notices/platform-access-and-use-terms-of-use';
const PRIVACY_URL = 'https://docs.kasu.finance/legal-notices/privacy-policy';
const IMPORTANT_INFO_URL =
  'https://docs.kasu.finance/important-information-when-lending/important-information';

/**
 * Profile — account details inline (no avatar), a settings menu, legal links,
 * and sign out. Real where we can be (account details, support, legal, version),
 * honest "Soon" where a feature isn't built. Zero crypto vocabulary.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user, logout } = usePrivy();
  const identity = useIdentity();
  const [copied, setCopied] = useState(false);

  const copyAccount = async () => {
    if (!identity.address) return;
    await Clipboard.setStringAsync(identity.address);
    haptics.select();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  async function handleSignOut() {
    try {
      if (user) await logout();
    } catch {
      // Ignore — sign out of the UI regardless.
    }
    router.replace('/(auth)/welcome');
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={[styles.backBtn, { backgroundColor: theme.backgroundElement }]}>
          <SymbolView name="chevron.left" size={18} tintColor={theme.text} />
        </Pressable>
        <ThemedText type="subtitle">Profile</ThemedText>
        <View style={styles.backBtn} />
      </View>

      {/* Account details */}
      <Card style={styles.card}>
        <Field label="Name" value={identity.name} />
        <Divider />
        <Field label="Email" value={identity.email || '—'} />
        <Divider />
        <Pressable accessibilityRole="button" onPress={copyAccount} style={styles.fieldRow}>
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
        <Field
          label="Identity"
          value={
            identity.isVerified ? (
              <Badge text="Verified" />
            ) : (
              <Pressable accessibilityRole="button" onPress={() => router.push('/card-kyc')}>
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
            <Field label="Member since" value={identity.memberSince} />
          </>
        ) : null}
      </Card>

      {/* Settings */}
      <Card style={styles.card}>
        <MenuRow
          icon="lock.fill"
          title="Security"
          subtitle="Additional security for your account"
          soon
        />
        <Divider />
        <MenuRow
          icon="bell.fill"
          title="Notifications"
          subtitle="Control how you receive updates"
          soon
        />
        <Divider />
        <MenuRow
          icon="questionmark.circle.fill"
          title="Get help"
          subtitle="Get your questions answered"
          onPress={() => {
            haptics.tap();
            Linking.openURL(
              `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Kasu app support')}`,
            ).catch(() => {});
          }}
        />
      </Card>

      {/* Legal */}
      <Card style={styles.card}>
        <MenuRow
          icon="doc.text.fill"
          title="Terms of Use"
          onPress={() => Linking.openURL(TERMS_URL).catch(() => {})}
        />
        <Divider />
        <MenuRow
          icon="hand.raised.fill"
          title="Privacy Policy"
          onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}
        />
        <Divider />
        <MenuRow
          icon="info.circle.fill"
          title="Important Information"
          onPress={() => Linking.openURL(IMPORTANT_INFO_URL).catch(() => {})}
        />
        <Divider />
        <View style={styles.fieldRow}>
          <ThemedText type="small" themeColor="textSecondary">
            Version
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {Constants.expoConfig?.version ?? '1.0.0'}
          </ThemedText>
        </View>
      </Card>

      <Button title="Sign out" variant="ghost" onPress={handleSignOut} style={styles.signOut} />
    </Screen>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View style={styles.fieldRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      {typeof value === 'string' ? (
        <ThemedText type="smallBold" numberOfLines={1} style={styles.fieldValue}>
          {value}
        </ThemedText>
      ) : (
        value
      )}
    </View>
  );
}

function MenuRow({
  icon,
  title,
  subtitle,
  onPress,
  soon,
}: {
  icon: SymbolViewProps['name'];
  title: string;
  subtitle?: string;
  onPress?: () => void;
  soon?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        if (soon) {
          haptics.tap();
          return;
        }
        onPress?.();
      }}
      style={styles.menuRow}>
      <SymbolView name={icon} size={22} tintColor={ACCENT} style={styles.menuIcon} />
      <View style={styles.menuText}>
        <ThemedText type="smallBold">{title}</ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {soon ? (
        <ThemedText type="small" themeColor="textSecondary">
          Soon
        </ThemedText>
      ) : (
        <SymbolView name="chevron.right" size={16} tintColor={theme.textSecondary} />
      )}
    </Pressable>
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
  card: { paddingVertical: 4, gap: 0 },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 12,
  },
  fieldValue: { flexShrink: 1, textAlign: 'right' },
  copyValue: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  menuIcon: { width: 26, textAlign: 'center' },
  menuText: { flex: 1, gap: 1 },
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
  signOut: { marginTop: 4 },
});
