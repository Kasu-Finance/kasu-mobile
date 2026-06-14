import { useState } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { ActivityScreen } from '@/features/activity';
import PaymentsScreen from '@/features/payments/payments-screen';
import NotificationsScreen from '@/features/notifications/notifications-screen';

type Seg = 'activity' | 'payments' | 'alerts';

/**
 * Activity tab — the "Recent activity" feed (deposits/yield/withdrawals),
 * P2P payments (F4), and the notification feed (F5). Each child screen renders
 * bare, so the selected one is wrapped in Screen here.
 */
export default function ActivityTab() {
  const [seg, setSeg] = useState<Seg>('activity');
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <Segmented
          value={seg}
          onChange={(k) => setSeg(k as Seg)}
          options={[
            { key: 'activity', label: 'Activity' },
            { key: 'payments', label: 'Payments' },
            { key: 'alerts', label: 'Alerts' },
          ]}
        />
      </View>
      <Screen>
        {seg === 'activity' ? (
          <ActivityScreen />
        ) : seg === 'payments' ? (
          <PaymentsScreen />
        ) : (
          <NotificationsScreen />
        )}
      </Screen>
    </View>
  );
}
