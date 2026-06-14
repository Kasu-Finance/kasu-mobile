import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';

import {
  useStartVerification,
  useWayexIdentity,
} from './use-wayex-identity';
import {
  isWayexReady,
  WAYEX_PENDING_KYC_STATUSES,
  type WayexIdentity,
} from './types';

/** Default KYC registration country. Wayex needs ISO 3166-1 alpha-2; v1
 *  corridor is US. Real apps would collect this — kept fixed here to match the
 *  v1 USD/ACH-only rail. */
const DEFAULT_COUNTRY = 'US';

/**
 * Renders its children only once Wayex KYC is `approved` AND ToS is
 * `accepted`. Otherwise shows the appropriate gate:
 *  - not started / rejected → a "Verify identity" button that calls
 *    `POST /wayex/verify` and opens the returned hosted `kycLink` in an
 *    in-app browser (Persona),
 *  - in-flight (initiated/pending/in_review) → a "verification in progress"
 *    notice with a refresh,
 *  - approved-but-ToS-pending → opens the `tosLink`.
 *
 * `enabled` gates the identity fetch on session presence.
 */
export function KycGate({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const identityQuery = useWayexIdentity(enabled);
  const startVerification = useStartVerification();
  const [opening, setOpening] = useState(false);

  if (!enabled) {
    return (
      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          Connect a session to continue.
        </ThemedText>
      </Card>
    );
  }

  if (identityQuery.isLoading) {
    return (
      <Card style={styles.center}>
        <ActivityIndicator color={theme.text} />
      </Card>
    );
  }

  const identity = identityQuery.data;

  if (identity && isWayexReady(identity)) {
    return <>{children}</>;
  }

  const openHostedLink = async (link: string | null | undefined) => {
    if (!link) return;
    setOpening(true);
    try {
      await WebBrowser.openBrowserAsync(link);
      // On return, refetch to pick up any status change.
      await identityQuery.refetch();
    } finally {
      setOpening(false);
    }
  };

  const handleVerify = async () => {
    try {
      const updated = await startVerification.mutateAsync({
        country: DEFAULT_COUNTRY,
      });
      await openHostedLink(updated.kycLink);
    } catch (err) {
      // Surface inline; identity query keeps prior state.
      console.warn('Wayex verify failed', err);
    }
  };

  return (
    <Card style={styles.gate}>
      <ThemedText type="smallBold">Verify your identity</ThemedText>
      <GateBody
        identity={identity}
        onVerify={handleVerify}
        onOpenTos={() => openHostedLink(identity?.tosLink)}
        onOpenKyc={() => openHostedLink(identity?.kycLink)}
        onRefresh={() => identityQuery.refetch()}
        busy={startVerification.isPending || opening}
        error={startVerification.error as Error | null}
      />
    </Card>
  );
}

function GateBody({
  identity,
  onVerify,
  onOpenTos,
  onOpenKyc,
  onRefresh,
  busy,
  error,
}: {
  identity: WayexIdentity | undefined;
  onVerify: () => void;
  onOpenTos: () => void;
  onOpenKyc: () => void;
  onRefresh: () => void;
  busy: boolean;
  error: Error | null;
}) {
  const kyc = identity?.kycStatus ?? 'not_started';
  const tos = identity?.tosStatus ?? 'not_accepted';

  // KYC approved but ToS still pending — point the user at the ToS link.
  if (kyc === 'approved' && tos !== 'accepted') {
    return (
      <>
        <ThemedText type="small" themeColor="textSecondary">
          Identity verified. Accept the terms of service to finish.
        </ThemedText>
        <Button title="Review & accept terms" loading={busy} onPress={onOpenTos} />
        <Button title="Refresh status" variant="ghost" onPress={onRefresh} />
      </>
    );
  }

  // Verification in flight — don't re-prompt; offer to reopen + refresh.
  if (WAYEX_PENDING_KYC_STATUSES.has(kyc)) {
    return (
      <>
        <ThemedText type="small" themeColor="textSecondary">
          Verification in progress. This usually completes within a few minutes.
        </ThemedText>
        {identity?.kycLink && (
          <Button title="Resume verification" loading={busy} onPress={onOpenKyc} />
        )}
        <Button title="Refresh status" variant="ghost" onPress={onRefresh} />
      </>
    );
  }

  // not_started or rejected — actionable.
  return (
    <>
      <ThemedText type="small" themeColor="textSecondary">
        {kyc === 'rejected'
          ? 'Your previous verification was declined. You can try again.'
          : 'A quick identity check is required before moving funds.'}
      </ThemedText>
      {error && (
        <ThemedText type="small" style={{ color: '#e4645a' }}>
          {error.message}
        </ThemedText>
      )}
      <Button
        title={kyc === 'rejected' ? 'Retry verification' : 'Verify identity'}
        loading={busy}
        onPress={onVerify}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', minHeight: 80 },
  gate: { gap: 12 },
});
