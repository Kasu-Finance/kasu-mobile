import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ACCENT } from '@/components/ui/theme-extras';
import { useTheme } from '@/hooks/use-theme';
import { useEthersSigner } from '@/lib/web3/use-ethers-signer';

import { useCardOnboard } from './use-card-onboard';
import { useCardStatus } from './use-card-status';
import { useCardTopup } from './use-card-topup';
import { type CardStatus } from './types';

const ERROR_COLOR = '#d4534e';

/**
 * Gnosis Pay card (F6). Renders by status:
 *   - `none`     -> onboarding CTA (POST /mobile/card/onboard + hosted flow),
 *   - `pending`  -> "in review" notice with refresh,
 *   - `active`   -> minimal card visual (last4 + KASU) and a top-up flow,
 *   - `frozen`   -> frozen notice,
 *   - `rejected` -> declined notice with retry onboarding.
 *
 * Mounted into the Card tab alongside the on-ramp "Add funds" flow during
 * integration. Errors from the (parallel) backend degrade to `none` inside
 * `useCardStatus`, so this screen never lands in a hard error state.
 */
export default function CardScreen() {
  const theme = useTheme();
  const { address } = useEthersSigner();
  const { status, last4, isLoading, isFetching, refetch } = useCardStatus(address);

  if (!address) {
    return (
      <Card style={styles.gap}>
        <ThemedText type="smallBold">Kasu card</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Connect a wallet to set up your Gnosis Pay card.
        </ThemedText>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card style={styles.center}>
        <ActivityIndicator color={theme.text} />
      </Card>
    );
  }

  return (
    <View style={styles.gap}>
      {status === 'none' && <OnboardingCta address={address} />}
      {status === 'rejected' && <RejectedState address={address} />}
      {status === 'pending' && (
        <PendingState refetch={refetch} refreshing={isFetching} />
      )}
      {status === 'frozen' && (
        <FrozenState last4={last4} refetch={refetch} refreshing={isFetching} />
      )}
      {status === 'active' && <ActiveState address={address} last4={last4} />}
    </View>
  );
}

/** `none` — never started: pitch + start onboarding. */
function OnboardingCta({ address }: { address: string }) {
  const onboard = useCardOnboard();
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setError(null);
    try {
      await onboard.openOnboarding({ userAddress: address });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error.');
    }
  };

  return (
    <Card style={styles.gap}>
      <ThemedText type="smallBold">Get the Kasu card</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Spend your stablecoin balance anywhere with a Gnosis Pay card. A quick
        one-time setup opens in your browser.
      </ThemedText>
      {error && <ErrorText message={error} />}
      <Button
        title="Set up card"
        loading={onboard.isPending}
        onPress={handleStart}
      />
    </Card>
  );
}

/** `rejected` — declined: explain + allow a retry of onboarding. */
function RejectedState({ address }: { address: string }) {
  const onboard = useCardOnboard();
  const [error, setError] = useState<string | null>(null);

  const handleRetry = async () => {
    setError(null);
    try {
      await onboard.openOnboarding({ userAddress: address });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error.');
    }
  };

  return (
    <Card style={styles.gap}>
      <ThemedText type="smallBold">Card application declined</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Your previous card application wasn&apos;t approved. You can review the
        details and try again.
      </ThemedText>
      {error && <ErrorText message={error} />}
      <Button
        title="Try again"
        loading={onboard.isPending}
        onPress={handleRetry}
      />
    </Card>
  );
}

/** `pending` — onboarding in review. */
function PendingState({
  refetch,
  refreshing,
}: {
  refetch: () => void;
  refreshing: boolean;
}) {
  return (
    <Card style={styles.gap}>
      <ThemedText type="smallBold">Card application in review</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        We&apos;re finishing your card setup. This usually completes shortly —
        check back in a little while.
      </ThemedText>
      <Button
        title="Refresh status"
        variant="ghost"
        loading={refreshing}
        onPress={refetch}
      />
    </Card>
  );
}

/** `frozen` — card temporarily disabled. */
function FrozenState({
  last4,
  refetch,
  refreshing,
}: {
  last4: string | null;
  refetch: () => void;
  refreshing: boolean;
}) {
  return (
    <View style={styles.gap}>
      <CardVisual last4={last4} status="frozen" />
      <Card style={styles.gap}>
        <ThemedText type="smallBold">Card frozen</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Your card is currently frozen and can&apos;t be used for payments.
          Manage your card in the Gnosis Pay app to unfreeze it.
        </ThemedText>
        <Button
          title="Refresh status"
          variant="ghost"
          loading={refreshing}
          onPress={refetch}
        />
      </Card>
    </View>
  );
}

/** `active` — live card: show the visual + top-up flow. */
function ActiveState({
  address,
  last4,
}: {
  address: string;
  last4: string | null;
}) {
  const topup = useCardTopup();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ txHash: string | null; accepted: boolean } | null>(
    null,
  );
  const theme = useTheme();

  const trimmed = amount.trim();
  const amountValid = Number(trimmed) > 0;

  const handleTopup = async () => {
    setError(null);
    setResult(null);
    if (!amountValid) {
      setError('Enter an amount greater than zero.');
      return;
    }
    try {
      const res = await topup.mutateAsync({ userAddress: address, amount: trimmed });
      setResult({ txHash: res.txHash ?? null, accepted: res.accepted });
      if (res.accepted) setAmount('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error.');
    }
  };

  return (
    <View style={styles.gap}>
      <CardVisual last4={last4} status="active" />

      <Card style={styles.gap}>
        <ThemedText type="smallBold">Top up</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Move funds from your wallet onto your card.
        </ThemedText>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={theme.textSecondary}
          keyboardType="decimal-pad"
          inputMode="decimal"
          style={[
            styles.input,
            { backgroundColor: theme.backgroundElement, color: theme.text },
          ]}
        />
        {error && <ErrorText message={error} />}
        {result && (
          <ThemedText type="small" themeColor="textSecondary">
            {result.accepted
              ? result.txHash
                ? `Top-up submitted · ${result.txHash.slice(0, 10)}…`
                : 'Top-up accepted.'
              : 'Top-up was not accepted. Try again.'}
          </ThemedText>
        )}
        <Button
          title="Top up card"
          loading={topup.isPending}
          disabled={!amountValid}
          onPress={handleTopup}
        />
      </Card>
    </View>
  );
}

/**
 * Minimal card visual — a flat surface with "KASU", the network and the last4.
 * Deliberately no gradients / art (matches the rest of the app's minimal kit).
 */
function CardVisual({
  last4,
  status,
}: {
  last4: string | null;
  status: Extract<CardStatus, 'active' | 'frozen'>;
}) {
  return (
    <View style={[styles.cardVisual, { backgroundColor: ACCENT }]}>
      <ThemedText type="smallBold" style={styles.cardBrand}>
        KASU
      </ThemedText>
      <View style={styles.cardFooter}>
        <ThemedText type="title" style={styles.cardNumber}>
          •••• {last4 ?? '••••'}
        </ThemedText>
        <ThemedText type="small" style={styles.cardMeta}>
          {status === 'frozen' ? 'Frozen' : 'Gnosis Pay'}
        </ThemedText>
      </View>
    </View>
  );
}

function ErrorText({ message }: { message: string }) {
  return (
    <ThemedText type="small" style={styles.error}>
      {message}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 12 },
  center: { alignItems: 'center', justifyContent: 'center', minHeight: 80 },
  error: { color: ERROR_COLOR },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  cardVisual: {
    borderRadius: 16,
    padding: 20,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  cardBrand: {
    color: '#1a1208',
    letterSpacing: 2,
  },
  cardFooter: {
    gap: 4,
  },
  cardNumber: {
    color: '#1a1208',
    fontSize: 24,
    lineHeight: 30,
    fontVariant: ['tabular-nums'],
  },
  cardMeta: {
    color: '#1a1208',
    opacity: 0.7,
  },
});
