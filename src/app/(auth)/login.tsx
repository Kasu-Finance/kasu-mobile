import { useLoginWithEmail, useLoginWithOAuth } from '@privy-io/expo';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Brand } from '@/components/ui/brand';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { env } from '@/lib/env';

/**
 * Login: email-OTP + Google / Apple / wallet (matches the web app).
 *
 * Privy creates an embedded wallet on first login. NOTE: every Privy mobile
 * login method requires native App Attest (iOS) / Play Integrity (Android) and
 * therefore CANNOT complete on the iOS Simulator. For demoing on the simulator,
 * `EXPO_PUBLIC_DEV_LOGIN_BYPASS=true` short-circuits the real flow and enters the
 * app read-only (same as "View demo portfolio"). Set it to false for real builds.
 */
export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { sendCode, loginWithCode } = useLoginWithEmail();
  const { login: oauthLogin } = useLoginWithOAuth();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bypass = env.devLoginBypass;
  const enterApp = () => router.replace('/(tabs)');

  async function handleSendCode() {
    if (bypass) return enterApp();
    setError(null);
    setBusy(true);
    try {
      await sendCode({ email });
      setStep('code');
    } catch {
      setError('Could not send the code. Check the email and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    setError(null);
    setBusy(true);
    try {
      const user = await loginWithCode({ code, email });
      if (user) enterApp();
      else setError('Invalid code. Please try again.');
    } catch {
      setError('Invalid code. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    if (bypass) return enterApp();
    setError(null);
    setBusy(true);
    try {
      const user = await oauthLogin({ provider });
      if (user) enterApp();
    } catch {
      setError(`Could not sign in with ${provider}. Please try again.`);
    } finally {
      setBusy(false);
    }
  }

  function handleWallet() {
    if (bypass) return enterApp();
    // TODO: external wallet (SIWE) connect via useLoginWithSiwe + WalletConnect.
    setError('Connecting an external wallet is coming soon on mobile.');
  }

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.backgroundElement },
  ];

  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Brand size={40} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.tagline}>
            Lend to Kasu. On-ramp, hold, and earn — from your phone.
          </ThemedText>
        </View>

        <View style={styles.form}>
          {step === 'email' ? (
            <>
              <TextInput
                style={inputStyle}
                placeholder="you@email.com"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
              />
              <Button
                title="Continue"
                onPress={handleSendCode}
                loading={busy}
                disabled={!bypass && !email.includes('@')}
              />

              <View style={styles.dividerRow}>
                <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
                <ThemedText type="small" themeColor="textSecondary">
                  or
                </ThemedText>
                <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
              </View>

              <Button title="Continue with Google" variant="secondary" onPress={() => handleOAuth('google')} />
              <Button title="Continue with Apple" variant="secondary" onPress={() => handleOAuth('apple')} />
              <Button title="Connect wallet" variant="secondary" onPress={handleWallet} />
            </>
          ) : (
            <>
              <TextInput
                style={inputStyle}
                placeholder="6-digit code"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                value={code}
                onChangeText={setCode}
              />
              <Button title="Verify & sign in" onPress={handleVerify} loading={busy} disabled={code.length < 6} />
              <Button title="Use a different email" variant="ghost" onPress={() => setStep('email')} />
            </>
          )}

          {error ? (
            <ThemedText type="small" style={{ color: '#e5484d' }}>
              {error}
            </ThemedText>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', gap: 32, padding: 4 },
  header: { gap: 12, alignItems: 'flex-start' },
  tagline: { lineHeight: 20 },
  form: { gap: 12 },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  divider: { flex: 1, height: 1 },
});
