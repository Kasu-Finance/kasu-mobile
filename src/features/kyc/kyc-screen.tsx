import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useEthersSigner } from '@/lib/web3/use-ethers-signer';

import type { KycStatus } from './use-kyc-status';
import { useKycStatus } from './use-kyc-status';

/** Human-friendly copy per normalized status. */
function describeStatus(status: KycStatus): { label: string; hint: string } {
  switch (status) {
    case 'Active':
      return { label: 'Verified', hint: 'Your identity is verified. You can lend and transact.' };
    case 'No Email':
      return {
        label: 'Verified',
        hint: 'Your identity is verified. Add an email in your profile to receive updates.',
      };
    case 'Pending':
      return { label: 'Pending', hint: 'Your verification is being processed.' };
    case 'In Review':
      return { label: 'In review', hint: 'We are reviewing your documents. This can take a little while.' };
    case 'Rejected':
      return { label: 'Rejected', hint: 'Your verification was not approved. You can try again.' };
    case 'Failed':
      return { label: 'Failed', hint: 'Verification did not complete. Please try again.' };
    case 'Terminated':
      return { label: 'Ended', hint: 'Your verification session ended. You can start a new one.' };
    case 'No status':
    default:
      return { label: 'Not started', hint: 'Verify your identity to unlock lending and payments.' };
  }
}

/**
 * Standalone KYC status screen: shows the current status, the linked email, and
 * a verify/re-verify CTA. Intended to be mounted inside Profile during
 * integration (the Profile screen is a foundation file we don't edit here).
 */
export default function KycScreen() {
  const router = useRouter();
  const { address } = useEthersSigner();
  const { status, email, canRetry, isVerified, isLoading, isFetching, refetch } =
    useKycStatus(address);

  const { label, hint } = describeStatus(status);
  const showVerifyCta = !isVerified && canRetry;

  return (
    <Screen>
      <ThemedText type="subtitle">Identity</ThemedText>

      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          Status
        </ThemedText>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.dot,
              { backgroundColor: isVerified ? '#3fa66a' : showVerifyCta ? '#c4996c' : '#9aa0a6' },
            ]}
          />
          <ThemedText>{isLoading ? 'Loading…' : label}</ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      </Card>

      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          Email
        </ThemedText>
        <ThemedText>{email ?? '—'}</ThemedText>
      </Card>

      {showVerifyCta ? (
        <Button
          title={status === 'No status' ? 'Verify identity' : 'Retry verification'}
          onPress={() => router.push('/kyc')}
        />
      ) : null}

      <Button
        title="Refresh status"
        variant="ghost"
        loading={isFetching}
        onPress={() => void refetch()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
