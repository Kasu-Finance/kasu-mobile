import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';

import { Colors } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

/**
 * Authenticated tab navigator (SDK 56 NativeTabs), tinted to the Kasu brand:
 * brass active tint on a brand-dark bar. Providers (`SdkProvider`,
 * `NotificationsProvider`) live in the root layout so they also cover
 * root-level routes outside this group.
 */
export default function TabsLayout() {
  // NativeTabs exposes no per-press event, so fire the selection tick off the
  // route change instead (skipping the initial mount).
  const pathname = usePathname();
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) haptics.select();
    else mounted.current = true;
  }, [pathname]);

  return (
    <NativeTabs
      tintColor={Colors.dark.primary}
      backgroundColor={Colors.dark.background}
      iconColor={Colors.dark.textSecondary}
      indicatorColor={Colors.dark.primaryPressed}
      rippleColor={Colors.dark.primaryPressed}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="earn">
        <NativeTabs.Trigger.Label>Earn</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.line.uptrend.xyaxis" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="rewards">
        <NativeTabs.Trigger.Label>Rewards</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gift" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
