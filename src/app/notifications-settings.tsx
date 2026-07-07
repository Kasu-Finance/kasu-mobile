import { useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ACCENT } from '@/components/ui/theme-extras';
import {
  useNotificationPrefs,
  type NotifPrefs,
} from '@/features/notifications/use-notification-prefs';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';

const CATEGORIES: {
  key: keyof NotifPrefs;
  icon: SymbolViewProps['name'];
  title: string;
  subtitle: string;
}[] = [
  {
    key: 'card',
    icon: 'creditcard.fill',
    title: 'Card & spending',
    subtitle: 'Purchases and card activity',
  },
  {
    key: 'money',
    icon: 'arrow.left.arrow.right',
    title: 'Money',
    subtitle: 'Deposits and transfers',
  },
  {
    key: 'rewards',
    icon: 'gift.fill',
    title: 'Rewards & interest',
    subtitle: 'Weekly interest and cashback',
  },
  {
    key: 'product',
    icon: 'sparkles',
    title: 'Product updates',
    subtitle: 'New features and improvements',
  },
];

/**
 * Notification settings — Plasma One-style: a master push toggle plus per-
 * category toggles. Prefs persist locally; the master gates device
 * registration. Reached from Profile → Notifications.
 */
export default function NotificationsSettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { prefs, setPref } = useNotificationPrefs();

  const toggle = (key: keyof NotifPrefs, value: boolean) => {
    haptics.select();
    setPref(key, value);
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
        <ThemedText type="subtitle">Notifications</ThemedText>
        <View style={styles.backBtn} />
      </View>

      {/* Master */}
      <Card style={styles.card}>
        <Row
          icon="bell.fill"
          title="Notifications"
          subtitle="Receive push notifications"
          value={prefs.enabled}
          onValueChange={(v) => toggle('enabled', v)}
        />
      </Card>

      {/* Categories — disabled when the master is off */}
      <Card style={styles.card}>
        {CATEGORIES.map((c, i) => (
          <View key={c.key}>
            {i > 0 ? (
              <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
            ) : null}
            <Row
              icon={c.icon}
              title={c.title}
              subtitle={c.subtitle}
              value={prefs.enabled && prefs[c.key]}
              disabled={!prefs.enabled}
              onValueChange={(v) => toggle(c.key, v)}
            />
          </View>
        ))}
      </Card>
    </Screen>
  );
}

function Row({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  disabled,
}: {
  icon: SymbolViewProps['name'];
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <SymbolView name={icon} size={22} tintColor={ACCENT} style={styles.rowIcon} />
      <View style={styles.rowText}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {subtitle}
        </ThemedText>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: ACCENT, false: theme.backgroundSelected }}
        thumbColor="#ffffff"
      />
    </View>
  );
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
  },
  rowDisabled: { opacity: 0.45 },
  rowIcon: { width: 26, textAlign: 'center' },
  rowText: { flex: 1, gap: 1 },
  divider: { height: StyleSheet.hairlineWidth },
});
