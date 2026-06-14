import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';

import { BankAccounts } from './bank-accounts';
import { KycGate } from './kyc-gate';
import { useDepositFiat } from './use-deposit-fiat';
import { useBankAccounts } from './use-bank-accounts';
import { useWayexSession } from './use-wayex-session';
import type { WayexDepositFiatResponse } from './types';

/**
 * On-ramp flow (add funds via bank wire). Stages:
 *   1. ensure a wallet-bound Wayex session,
 *   2. ensure Wayex KYC + ToS (KycGate; opens the hosted Persona link),
 *   3. ensure at least one bank account is registered,
 *   4. `POST /wayex/deposit-fiat` → render the returned bank wire
 *      instructions as a Card list (reference is highlighted — it MUST go in
 *      the wire memo).
 *
 * The actual money movement happens off-app on the user's bank side; the app
 * sees the credit later via the backend `fiat_onramp_external` webhook.
 */
export function AddFunds() {
  const { ready, address, hasSession, ensureSession, isConnecting } =
    useWayexSession();
  const [sessionReady, setSessionReady] = useState(hasSession);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const handleEnsureSession = async () => {
    setSessionError(null);
    try {
      await ensureSession();
      setSessionReady(true);
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : 'Unknown error.');
    }
  };

  const enabled = sessionReady || hasSession;

  if (!enabled) {
    return (
      <Card style={styles.gap}>
        <ThemedText type="smallBold">Add funds</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Wire USD and we&apos;ll convert it to USDC on Base, straight to your
          wallet. Start by opening a secure session.
        </ThemedText>
        {sessionError && (
          <ThemedText type="small" style={styles.error}>
            {sessionError}
          </ThemedText>
        )}
        <Button
          title="Continue"
          loading={isConnecting}
          disabled={!ready}
          onPress={handleEnsureSession}
        />
      </Card>
    );
  }

  return (
    <View style={styles.gap}>
      <KycGate enabled={enabled}>
        <AddFundsBody enabled={enabled} address={address} />
      </KycGate>
    </View>
  );
}

function AddFundsBody({
  enabled,
  address,
}: {
  enabled: boolean;
  address: string | null;
}) {
  const accountsQuery = useBankAccounts(enabled);
  const depositFiat = useDepositFiat();
  const [instructions, setInstructions] =
    useState<WayexDepositFiatResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasAccount = (accountsQuery.data?.length ?? 0) > 0;

  const handleGenerate = async () => {
    setError(null);
    if (!address) {
      setError('Connect a wallet to receive funds.');
      return;
    }
    try {
      const res = await depositFiat.mutateAsync({ destinationAddress: address });
      setInstructions(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error.');
    }
  };

  if (instructions) {
    return <DepositInstructions instructions={instructions} />;
  }

  return (
    <View style={styles.gap}>
      <Card style={styles.gap}>
        <ThemedText type="smallBold">Add funds</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Generate bank wire instructions. Send the wire from your bank and
          we&apos;ll credit USDC to your wallet — usually within 1–2 hours of
          your bank releasing the funds.
        </ThemedText>
        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}
        <Button
          title="Get deposit instructions"
          loading={depositFiat.isPending}
          onPress={handleGenerate}
        />
      </Card>

      {/* A registered bank account isn't strictly required for an inbound wire,
          but we surface the list here so the user can manage payout accounts
          alongside the on-ramp. */}
      {!hasAccount && (
        <BankAccounts enabled={enabled} />
      )}
    </View>
  );
}

function DepositInstructions({
  instructions,
}: {
  instructions: WayexDepositFiatResponse;
}) {
  // `reference` and `id` are the fixed keys; the rest are rail-specific bank
  // fields. Show reference first (highlighted), then the remaining fields.
  const { id, reference, ...rest } = instructions;
  void id;

  return (
    <View style={styles.gap}>
      <ThemedText type="smallBold">Bank wire instructions</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Include the reference in your transfer memo, or we can&apos;t match the
        deposit to your account.
      </ThemedText>

      <InstructionRow label="Reference" value={reference} emphasised />
      {Object.entries(rest).map(([key, value]) => (
        <InstructionRow key={key} label={prettyLabel(key)} value={String(value)} />
      ))}
    </View>
  );
}

function InstructionRow({
  label,
  value,
  emphasised = false,
}: {
  label: string;
  value: string;
  emphasised?: boolean;
}) {
  const theme = useTheme();
  return (
    <Card>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText
        type={emphasised ? 'smallBold' : 'small'}
        style={[styles.mono, emphasised && { color: theme.text, fontSize: 16 }]}>
        {value}
      </ThemedText>
    </Card>
  );
}

function prettyLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  gap: { gap: 12 },
  error: { color: '#e4645a' },
  mono: { fontVariant: ['tabular-nums'] },
});
