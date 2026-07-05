import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { ActivityScreen } from '@/features/activity';
import NotificationsScreen from '@/features/notifications/notifications-screen';
import { useTheme } from '@/hooks/use-theme';
import { queryClient } from '@/lib/query/query-client';

type Seg = 'activity' | 'alerts';

/**
 * Activity tab — the "Recent activity" feed (deposits/yield/withdrawals/
 * transfers) and the notification feed (F5). Send lives on Home; receiving is
 * the deposit screen. The segmented switcher is pinned above the scrolling body
 * and carries the top safe-area inset itself (the body `Screen` opts out with
 * `edges={[]}` to avoid a double inset).
 */
export default function ActivityTab() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [seg, setSeg] = useState<Seg>('activity');
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 12 }}>
        <Segmented
          value={seg}
          onChange={(k) => setSeg(k as Seg)}
          options={[
            { key: 'activity', label: 'Activity' },
            { key: 'alerts', label: 'Alerts' },
          ]}
        />
      </View>
      <Screen
        edges={[]}
        onRefresh={() =>
          queryClient.invalidateQueries({
            predicate: (q) =>
              ['activity', 'mobile'].includes(q.queryKey[0] as string),
          })
        }>
        {seg === 'activity' ? <ActivityScreen /> : <NotificationsScreen />}
      </Screen>
    </View>
  );
}
