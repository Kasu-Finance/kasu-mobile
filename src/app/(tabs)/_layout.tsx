import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';

/**
 * Authenticated tab navigator (SDK 56 NativeTabs), tinted to the Kasu brand:
 * brass active tint on a brand-dark bar. Providers (`SdkProvider`,
 * `NotificationsProvider`) live in the root layout so they also cover
 * root-level routes outside this group.
 */
export default function TabsLayout() {
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
      <NativeTabs.Trigger name="lend">
        <NativeTabs.Trigger.Label>Lend</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.line.uptrend.xyaxis" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="activity">
        <NativeTabs.Trigger.Label>Activity</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="clock" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
