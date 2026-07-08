import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { HelpButton, type HelpItem } from '@/components/ui/help-button';
import { Avatar } from '@/features/profile/avatar';
import { useIdentity } from '@/features/profile/use-identity';

/**
 * Consistent top header for the main tabs: the profile avatar (→ /profile) on
 * the left, and an optional "?" help button on the right (Plasma-style). No
 * page title — the tab bar already says which screen this is. Only pass `help`
 * where an explanation genuinely adds something (e.g. Earn/strategies).
 */
export function TabHeader({ help }: { help?: { title: string; items: HelpItem[] } }) {
  const router = useRouter();
  const identity = useIdentity();
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Account and settings"
        onPress={() => router.push('/profile')}>
        <Avatar initial={identity.initial} size={40} />
      </Pressable>
      {help ? <HelpButton title={help.title} items={help.items} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
