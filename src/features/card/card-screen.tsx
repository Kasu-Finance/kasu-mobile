import { usePrivy } from '@privy-io/expo';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ACCENT } from '@/components/ui/theme-extras';
import { VisaCard } from '@/components/ui/visa-card';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatUnits, formatUsd } from '@/lib/format';
import { useEthersSigner } from '@/lib/web3/use-ethers-signer';

import { useCardOnboard } from './use-card-onboard';
import { useCardPanReveal, type RevealedCard } from './use-card-pan';
import { useCardStatus } from './use-card-status';
import { useCardTransactions } from './use-card-transactions';
import { useSeedDemoSpend, useSimulatePurchase } from './use-card-demo';
import { useEnsureCardSession } from './use-card-session';
import { haptics } from '@/lib/haptics';
import { useCardTopup } from './use-card-topup';
import { type CardBackendStatus, type CardStatus } from './types';

const ERROR_COLOR = '#e4645a';

/**
 * Kasu card (F6). Renders by the backend onboarding state machine:
 *   - session-required -> silently establishing (embedded wallet signs), shows
 *     a brief "preparing" state — never a visible wallet step,
 *   - kyc-required     -> identity-verification CTA (framed as card partner),
 *   - kyc-pending      -> "verification in progress",
 *   - ready            -> finish setup (create the card),
 *   - active           -> minimal card visual + top-up,
 *   - (rejected mapped to a declined state).
 *
 * Errors from the backend degrade to `none` inside `useCardStatus`, so this
 * screen never lands in a hard error state.
 */
export default function CardScreen() {
  const theme = useTheme();
  const { address } = useEthersSigner();
  const {
    status,
    backendStatus,
    last4,
    kycUrl,
    balance,
    activeCardId,
    isLoading,
    isFetching,
    refetch,
  } = useCardStatus(address);

  // Establish the card session invisibly the moment the wallet is ready.
  useEnsureCardSession(address, backendStatus);

  // KYC happens in the system browser, so refetch when the app returns to the
  // foreground — the card then advances past verification automatically.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refetch();
    });
    return () => sub.remove();
  }, [refetch]);

  // Celebrate the card going live — only on a transition observed while
  // mounted, not when the screen opens with an already-active card.
  const prevStatus = useRef<CardStatus | null>(null);
  useEffect(() => {
    if (prevStatus.current && prevStatus.current !== 'active' && status === 'active') {
      haptics.success();
    }
    prevStatus.current = status;
  }, [status]);

  if (!address) {
    return (
      <Card style={styles.gap}>
        <ThemedText type="smallBold">Kasu card</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Sign in to set up your Kasu card.
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
      {status === 'active' ? (
        <ActiveState address={address} last4={last4} cardId={activeCardId} balance={balance} />
      ) : status === 'rejected' ? (
        <RejectedState address={address} />
      ) : status === 'frozen' ? (
        <FrozenState last4={last4} refetch={refetch} refreshing={isFetching} />
      ) : (
        <OnboardingCard
          address={address}
          backendStatus={backendStatus}
          kycUrl={kycUrl}
          refetch={refetch}
          refreshing={isFetching}
        />
      )}
    </View>
  );
}

/**
 * The onboarding sub-flow, keyed off the backend state machine. The wallet /
 * session step is invisible (handled by `useEnsureCardSession`), so the user
 * only ever sees: preparing -> verify identity -> in review -> finish.
 */
function OnboardingCard({
  address,
  backendStatus,
  kycUrl,
  refetch,
  refreshing,
}: {
  address: string;
  backendStatus: CardBackendStatus;
  kycUrl: string | null;
  refetch: () => void;
  refreshing: boolean;
}) {
  const onboard = useCardOnboard();
  const [error, setError] = useState<string | null>(null);

  const run = async (input: {
    userAddress: string;
    email?: string;
    phone?: string;
  }) => {
    setError(null);
    try {
      await onboard.advanceOnboarding(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error.');
    }
  };

  // Creating the card is the last step — send the user back to Home, where the
  // card entry shows the settling/active state. Avoids stranding them on this
  // screen after a "thinking then done" gap.
  const handleCreate = async () => {
    setError(null);
    try {
      await onboard.advanceOnboarding({ userAddress: address });
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error.');
    }
  };

  // session-required (session still establishing) or none (first read).
  if (backendStatus === 'session-required' || backendStatus === 'none') {
    return (
      <Card style={styles.gap}>
        <ThemedText type="smallBold">Get the Kasu card</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Spend your balance anywhere Mastercard is accepted — with cashback on
          every purchase. Setting things up…
        </ThemedText>
        <View style={styles.inlineLoading}>
          <ActivityIndicator />
        </View>
      </Card>
    );
  }

  if (backendStatus === 'kyc-required') {
    return (
      <VerifyIdentityCard
        address={address}
        hasKycUrl={Boolean(kycUrl)}
        pending={onboard.isPending}
        error={error}
        onSubmit={(email, phone) => run({ userAddress: address, email, phone })}
      />
    );
  }

  if (backendStatus === 'kyc-pending' || backendStatus === 'blocked') {
    return (
      <Card style={styles.gap}>
        <ThemedText type="smallBold">Verification in progress</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          We&apos;re confirming your details. This usually completes within a few
          minutes.
        </ThemedText>
        <Button
          title="Refresh"
          variant="ghost"
          loading={refreshing}
          onPress={refetch}
        />
      </Card>
    );
  }

  // ready — finish setup by creating the card.
  return (
    <Card style={styles.gap}>
      <ThemedText type="smallBold">You&apos;re all set</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Create your card to start spending.
      </ThemedText>
      {error && <ErrorText message={error} />}
      <Button
        title="Create my card"
        loading={onboard.isPending}
        onPress={handleCreate}
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

/**
 * Identity verification (backend `kyc-required`). Collects a phone number and
 * pulls the email from the signed-in account, submits them as the KYC contact
 * prerequisites, then hands off to the card partner's hosted check. Framed as a
 * bank's "confirm your details", never as crypto KYC.
 */
function VerifyIdentityCard({
  address,
  hasKycUrl,
  pending,
  error,
  onSubmit,
}: {
  address: string;
  hasKycUrl: boolean;
  pending: boolean;
  error: string | null;
  onSubmit: (email: string | undefined, phone: string | undefined) => void;
}) {
  const theme = useTheme();
  const { user } = usePrivy();
  const emailAccount = user?.linked_accounts?.find((a) => a.type === 'email');
  const email =
    emailAccount && 'address' in emailAccount ? emailAccount.address : undefined;
  const [phone, setPhone] = useState('');
  void address;

  const phoneValid = /^\+?[0-9 ]{7,}$/.test(phone.trim());

  return (
    <Card style={styles.gap}>
      <ThemedText type="smallBold">Verify your identity</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        One quick check with our card partner and your card is ready. It takes a
        couple of minutes.
      </ThemedText>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="Mobile number"
        placeholderTextColor={theme.textSecondary}
        keyboardType="phone-pad"
        inputMode="tel"
        autoComplete="tel"
        style={[
          styles.input,
          { backgroundColor: theme.backgroundElement, color: theme.text },
        ]}
      />
      {error && <ErrorText message={error} />}
      <Button
        title={hasKycUrl ? 'Verify identity' : 'Continue'}
        loading={pending}
        disabled={!phoneValid}
        onPress={() => onSubmit(email, phone.trim())}
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
          Contact support to unfreeze it.
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

/** `active` — live card: the flippable card (real PAN on flip) + top-up flow. */
function ActiveState({
  address,
  last4,
  cardId,
  balance,
}: {
  address: string;
  last4: string | null;
  cardId: string | null;
  balance: string | null;
}) {
  const topup = useCardTopup();
  const reveal = useCardPanReveal();
  const simulate = useSimulatePurchase();
  const cardTx = useCardTransactions(address);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ txHash: string | null; accepted: boolean } | null>(
    null,
  );
  const [revealed, setRevealed] = useState<RevealedCard | null>(null);
  const theme = useTheme();

  // Sandbox: seed a few realistic purchases the first time the card is live.
  useSeedDemoSpend(address, true, cardTx.data?.length ?? 0, cardTx.isLoading);

  const trimmed = amount.trim();
  const amountValid = Number(trimmed) > 0;
  // Card-funding balance is USDC minor units (6 decimals).
  const cardBalance = balance ? formatUsd(formatUnits(balance, 6)) : '$0.00';

  // Fetch the real PAN the first time the user flips to the card back.
  const handleFlip = (toBack: boolean) => {
    if (!toBack || revealed || reveal.isPending || !cardId) return;
    reveal
      .mutateAsync({ userAddress: address, cardId })
      .then(setRevealed)
      .catch(() => {
        /* leave masked on failure */
      });
  };

  const handleTopup = async () => {
    setError(null);
    setResult(null);
    if (!amountValid) {
      setError('Enter an amount greater than zero.');
      return;
    }
    try {
      const res = await topup.mutateAsync({ userAddress: address, amount: trimmed });
      const accepted = res.accepted ?? false;
      // 'onchain' mode returns the Funds Storage depositAddress instead of
      // moving money — sending the transfer from the wallet is W5.
      setResult({ txHash: res.depositAddress ?? null, accepted });
      if (accepted) setAmount('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error.');
    }
  };

  return (
    <View style={styles.gap}>
      <VisaCard
        balance={cardBalance}
        last4={last4}
        pan={revealed?.pan}
        expiry={revealed?.expiry}
        cvc={revealed?.cvc}
        onFlip={handleFlip}
      />
      <ThemedText type="small" themeColor="textSecondary" style={styles.tapHint}>
        Tap the card to reveal your number.
      </ThemedText>

      <Card style={styles.gap}>
        <ThemedText type="smallBold">Top up</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Move money from your balance onto your card.
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

      <Button
        title="Add a sample purchase"
        variant="ghost"
        loading={simulate.isPending}
        onPress={() => simulate.mutate(address)}
      />
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
          {status === 'frozen' ? 'Frozen' : 'Kasu'}
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
  inlineLoading: { paddingVertical: 8, alignItems: 'flex-start' },
  tapHint: { textAlign: 'center' },
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
    color: '#241a0c',
    letterSpacing: 2,
  },
  cardFooter: {
    gap: 4,
  },
  cardNumber: {
    fontFamily: Fonts.sansBold,
    color: '#241a0c',
    fontSize: 24,
    lineHeight: 30,
    fontVariant: ['tabular-nums'],
  },
  cardMeta: {
    color: '#241a0c',
    opacity: 0.7,
  },
});
