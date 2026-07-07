import { usePrivy } from '@privy-io/expo';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ACCENT } from '@/components/ui/theme-extras';
import { Avatar } from '@/features/profile/avatar';
import { useIdentity } from '@/features/profile/use-identity';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';

const SUPPORT_EMAIL = 'support@kasu.finance';
const TERMS_URL = 'https://kasu.finance/terms';
const PRIVACY_URL = 'https://kasu.finance/privacy';

/**
 * Profile — Plasma One-style: initial avatar, membership + "since", a settings
 * menu, an about card, and sign out. Real where we can be (account details,
 * support, legal links, version); honest "coming soon" where a feature isn't
 * built yet. Zero crypto vocabulary.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user, logout } = usePrivy();
  const identity = useIdentity();

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
      </View>

      {/* Identity */}
      <View style={styles.identity}>
        <View>
          <Avatar initial={identity.initial} size={96} />
          <View style={[styles.editBadge, { backgroundColor: theme.background }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
              onPress={() => router.push('/account')}
              style={[styles.editInner, { backgroundColor: theme.backgroundElement }]}>
              <SymbolView name="pencil" size={14} tintColor={theme.text} />
            </Pressable>
          </View>
        </View>

        <View style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold">
            {identity.isVerified ? 'Verified member' : 'Kasu member'}
          </ThemedText>
        </View>
        {identity.memberSince ? (
          <ThemedText type="small" themeColor="textSecondary">
            Since {identity.memberSince}
          </ThemedText>
        ) : null}
      </View>

      {/* Settings menu */}
      <Card style={styles.menu}>
        <MenuRow
          icon="person.fill"
          title="Account"
          subtitle="Your account details"
          onPress={() => router.push('/account')}
        />
        <Divider />
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

      {/* About */}
      <Card style={styles.menu}>
        <MenuRow
          icon="doc.text.fill"
          title="Terms of Service"
          onPress={() => Linking.openURL(TERMS_URL).catch(() => {})}
        />
        <Divider />
        <MenuRow
          icon="hand.raised.fill"
          title="Privacy Policy"
          onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}
        />
        <Divider />
        <View style={styles.versionRow}>
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
      style={styles.row}>
      <SymbolView name={icon} size={22} tintColor={ACCENT} style={styles.rowIcon} />
      <View style={styles.rowText}>
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

function Divider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: { alignItems: 'center', gap: 10, paddingTop: 8, paddingBottom: 8 },
  editBadge: {
    position: 'absolute',
    right: -2,
    top: -2,
    padding: 3,
    borderRadius: 16,
  },
  editInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    marginTop: 6,
  },
  menu: { paddingVertical: 4, gap: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  rowIcon: { width: 26, textAlign: 'center' },
  rowText: { flex: 1, gap: 1 },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  divider: { height: StyleSheet.hairlineWidth },
  signOut: { marginTop: 4 },
});
