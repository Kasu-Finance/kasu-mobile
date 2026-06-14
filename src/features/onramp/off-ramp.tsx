import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api/client';

import { ACCENT } from '@/components/ui/theme-extras';
import { BankAccounts } from './bank-accounts';
import { KycGate } from './kyc-gate';
import { useBankAccounts } from './use-bank-accounts';
import { useWayexSession } from './use-wayex-session';
import type {
  WayexDepositCryptoRequest,
  WayexDepositCryptoResponse,
  WayexExternalAccount,
} from './types';

/**
 * ════════════════════════════════════════════════════════════════════════
 * TODO (BACKEND): off-ramp payout endpoint does NOT exist yet.
 *
 * The Wayex off-ramp ("send crypto, receive fiat to a bank account") maps to
 * Wayex's `POST /depositcrypto`. The backend HAS a client method for it
 * (`WayexClient.depositCrypto` → `/depositcrypto`, kasu-backend/src/wayex/
 * wayex.client.ts:52) and the request/response types
 * (`WayexDepositCryptoRequest` / `WayexDepositCryptoResponse`,
 * wayex.types.ts:100-111) — BUT there is NO controller route exposing it.
 * `WayexController` (wayex.controller.ts) only exposes deposit-fiat (on-ramp).
 *
 * This UI calls `POST /wayex/deposit-crypto` (the natural REST name, parallel
 * to the existing `POST /wayex/deposit-fiat`). That route must be added to
 * `WayexController` before this flow works end-to-end — it WILL 404 today.
 * Body shape below matches `WayexDepositCryptoRequest`.
 * ════════════════════════════════════════════════════════════════════════
 */
const OFFRAMP_TODO_ENDPOINT = '/wayex/deposit-crypto';

function useDepositCrypto() {
  return useMutation({
    mutationFn: async (
      input: WayexDepositCryptoRequest,
    ): Promise<WayexDepositCryptoResponse> => {
      const res = await api.post<WayexDepositCryptoResponse>(
        OFFRAMP_TODO_ENDPOINT,
        input,
      );
      return res.data;
    },
  });
}

/**
 * Off-ramp flow (withdraw to bank). Same gating as on-ramp:
 *   1. ensure session,
 *   2. ensure KYC + ToS,
 *   3. require a registered bank account (the payout destination),
 *   4. request a crypto deposit address to send funds to (→ converted to fiat
 *      and paid out to the selected bank account).
 *
 * NOTE: step 4 hits a not-yet-implemented backend route (see the TODO above).
 */
export function OffRamp() {
  const { ready, hasSession, ensureSession, isConnecting } = useWayexSession();
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
        <ThemedText type="smallBold">Withdraw to bank</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Convert USDC back to USD and send it to your bank. Start by opening a
          secure session.
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
        <OffRampBody enabled={enabled} />
      </KycGate>
    </View>
  );
}

function OffRampBody({ enabled }: { enabled: boolean }) {
  const accountsQuery = useBankAccounts(enabled);
  const depositCrypto = useDepositCrypto();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accounts = accountsQuery.data ?? [];
  const selected = accounts.find((a) => a.id === selectedId) ?? accounts[0];

  const handleWithdraw = async () => {
    setError(null);
    if (!selected) {
      setError('Add a bank account to withdraw to.');
      return;
    }
    try {
      const res = await depositCrypto.mutateAsync({
        // Fiat the user wants to receive. v1 corridor: USD/ACH.
        asset: 'USD',
        network: 'ACH',
        externalAccountId: selected.id,
        externalAccountAsset: selected.asset,
        externalAccountNetwork: selected.networks[0] ?? 'ACH',
      });
      setDepositAddress(res.address);
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} (off-ramp endpoint may not be deployed yet)`
          : 'Unknown error.',
      );
    }
  };

  if (depositAddress) {
    return (
      <View style={styles.gap}>
        <ThemedText type="smallBold">Send USDC to withdraw</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Send USDC to the address below. We&apos;ll convert it to USD and pay
          out to {selected?.nickname ?? 'your bank account'}.
        </ThemedText>
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            Deposit address
          </ThemedText>
          <ThemedText type="smallBold" style={styles.mono}>
            {depositAddress}
          </ThemedText>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.gap}>
      <ThemedText type="smallBold">Withdraw to bank</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Choose the bank account to receive your payout.
      </ThemedText>

      {accounts.length === 0 ? (
        <BankAccounts enabled={enabled} onAccountAdded={(id) => setSelectedId(id)} />
      ) : (
        <View style={styles.gap}>
          {accounts.map((account) => (
            <PayoutOption
              key={account.id}
              account={account}
              selected={selected?.id === account.id}
              onSelect={() => setSelectedId(account.id)}
            />
          ))}
          <BankAccounts enabled={enabled} onAccountAdded={(id) => setSelectedId(id)} />
        </View>
      )}

      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}

      <Button
        title="Continue withdrawal"
        loading={depositCrypto.isPending}
        disabled={accounts.length === 0}
        onPress={handleWithdraw}
      />
      <ThemedText type="small" themeColor="textSecondary">
        Note: the off-ramp backend endpoint ({OFFRAMP_TODO_ENDPOINT}) is not
        deployed yet — this step is wired but will not complete until it is added
        to the backend.
      </ThemedText>
    </View>
  );
}

function PayoutOption({
  account,
  selected,
  onSelect,
}: {
  account: WayexExternalAccount;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onSelect}>
      <Card
        style={[
          selected && { borderWidth: 1, borderColor: ACCENT },
        ]}>
        <ThemedText type="smallBold">
          {account.nickname || account.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {account.asset} · ••••{account.preview}
        </ThemedText>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 12 },
  error: { color: '#d4534e' },
  mono: { fontVariant: ['tabular-nums'] },
});
