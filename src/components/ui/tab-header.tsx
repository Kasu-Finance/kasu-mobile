import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { HelpButton, type HelpItem } from '@/components/ui/help-button';
import { Avatar } from '@/features/profile/avatar';
import { useIdentity } from '@/features/profile/use-identity';

/**
 * Consistent top header for the main tabs: the profile avatar (→ /profile) on
 * the left and a "?" help button on the right (Plasma-style). No page title —
 * the tab bar already says which screen this is. Wordy explanations live behind
 * the "?".
 */
export function TabHeader({ help }: { help: { title: string; items: HelpItem[] } }) {
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
      <HelpButton title={help.title} items={help.items} />
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
