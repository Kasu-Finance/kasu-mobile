import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useEthersSigner } from '@/lib/web3/use-ethers-signer';

import { useNotificationsFeed } from './notifications-provider';
import type { FeedNotification } from './types';
import { useRegisterPush } from './use-register-push';

type PermState = 'unknown' | 'granted' | 'denied' | 'undetermined';

/**
 * Notifications screen — shows the current permission status with an enable
 * button, plus the in-app feed of received notifications.
 *
 * Drives push registration via `useRegisterPush` (keyed on the connected wallet
 * address) and reads the persisted feed from `useNotificationsFeed`. Mounted by
 * the host during integration, under `NotificationsProvider`.
 */
export default function NotificationsScreen() {
  const { address } = useEthersSigner();
  const { feed } = useNotificationsFeed();
  const register = useRegisterPush(address);

  const [perm, setPerm] = useState<PermState>('unknown');

  const refreshPermission = useCallback(async () => {
    try {
      const settings = await Notifications.getPermissionsAsync();
      if (settings.granted) {
        setPerm('granted');
      } else if (settings.canAskAgain) {
        setPerm('undetermined');
      } else {
        setPerm('denied');
      }
    } catch {
      setPerm('unknown');
    }
  }, []);

  useEffect(() => {
    void refreshPermission();
  }, [refreshPermission, register.registered]);

  const onEnable = useCallback(async () => {
    try {
      await Notifications.requestPermissionsAsync();
    } catch {
      // Ignore — refreshPermission reflects the resulting state.
    }
    await refreshPermission();
  }, [refreshPermission]);

  const statusLabel =
    perm === 'granted'
      ? 'Notifications are enabled'
      : perm === 'denied'
        ? 'Notifications are blocked'
        : perm === 'undetermined'
          ? 'Notifications are not enabled yet'
          : 'Checking notification settings…';

  const statusHint =
    perm === 'denied'
      ? 'Enable notifications for Kasu in your device Settings to receive alerts.'
      : register.error
        ? register.error.message
        : undefined;

  return (
    <View style={styles.container}>
      <Card style={styles.permCard}>
        <ThemedText type="smallBold">{statusLabel}</ThemedText>
        {statusHint ? (
          <ThemedText type="small" themeColor="textSecondary">
            {statusHint}
          </ThemedText>
        ) : null}
        {perm !== 'granted' && perm !== 'denied' ? (
          <Button
            title="Enable notifications"
            loading={register.isRegistering}
            onPress={onEnable}
          />
        ) : null}
      </Card>

      <View style={styles.section}>
        <ThemedText type="smallBold">Recent</ThemedText>

        {feed.length === 0 ? (
          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              No notifications yet. You&apos;ll see deposits, payments and other
              alerts here.
            </ThemedText>
          </Card>
        ) : (
          feed.map((item) => <NotificationRow key={item.id} item={item} />)
        )}
      </View>
    </View>
  );
}

function NotificationRow({ item }: { item: FeedNotification }) {
  return (
    <Card style={styles.row}>
      <View style={styles.rowHeader}>
        <ThemedText type="smallBold" style={styles.rowTitle}>
          {item.title || 'Notification'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatTime(item.receivedAt)}
        </ThemedText>
      </View>
      {item.body ? (
        <ThemedText type="small" themeColor="textSecondary">
          {item.body}
        </ThemedText>
      ) : null}
    </Card>
  );
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  return sameDay
    ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: { gap: 20 },
  permCard: { gap: 12 },
  section: { gap: 8 },
  row: { gap: 4 },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowTitle: { flexShrink: 1 },
});
