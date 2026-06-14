import { usePrivy } from '@privy-io/expo';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { env } from '@/lib/env';

/**
 * Entry route — redirects to the authenticated tabs or the login screen based
 * on Privy auth state. `usePrivy` is isolated to `AuthedEntry` so it is never
 * called when Privy isn't configured (dev convenience).
 */
export default function Index() {
  if (!env.privyAppId) return <Redirect href="/(tabs)" />;
  return <AuthedEntry />;
}

function AuthedEntry() {
  const { user, isReady } = usePrivy();
  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  return <Redirect href={user ? '/(tabs)' : '/(auth)/login'} />;
}
