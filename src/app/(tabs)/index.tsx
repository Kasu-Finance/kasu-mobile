import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ActivityScreen } from '@/features/activity';
import {
  CardHomeEntry,
  CardManagement,
  useCardStatus,
  useCardPanReveal,
  useCardTransactions,
  useEnsureCardSession,
  useSeedDemoCard,
  type RevealedCard,
} from '@/features/card';
import { Screen } from '@/components/ui/screen';
import { VisaCard } from '@/components/ui/visa-card';
import { Avatar } from '@/features/profile/avatar';
import { useIdentity } from '@/features/profile/use-identity';
import { AddMoneySheet } from '@/features/onramp/add-money-sheet';
import { SendSheet } from '@/features/onramp/send-sheet';
import { formatUnits, formatUsd } from '@/lib/format';
import { DEFAULT_CHAIN_ID, getChain } from '@/lib/web3/chains';
import { useStableBalance } from '@/lib/web3/use-balance';
import { useViewAddress } from '@/lib/web3/use-view-address';

type Sheet = 'add' | 'send' | null;

/**
 * Home: neobank dashboard. The card is the hero — tapping it flips it to reveal
 * the real number and swaps the content below for card management (top up +
 * card activity). Flipping back returns to the account view. Two primary
 * actions (Add funds / Send), Plasma One-style. Pull down to refresh.
 */
export default function HomeScreen() {
  const router = useRouter();
  const { viewAddress } = useViewAddress();
  const identity = useIdentity();
  const chain = getChain(DEFAULT_CHAIN_ID);
  const balanceQuery = useStableBalance(viewAddress, DEFAULT_CHAIN_ID);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [flipped, setFlipped] = useState(false);

  const card = useCardStatus(viewAddress);
  const cardTx = useCardTransactions(viewAddress);
  const reveal = useCardPanReveal();
  const [revealed, setRevealed] = useState<RevealedCard | null>(null);

  // The Immersve session is in-memory on the backend and is cleared on every
  // deploy — re-establish it silently from Home so an existing card reappears
  // (embedded wallet signs the challenge with no user step).
  useEnsureCardSession(viewAddress, card.backendStatus);

  // Fund + seed a realistic history the first time the card is active.
  useSeedDemoCard(viewAddress, card.isActive, cardTx.data?.length ?? 0, cardTx.isLoading);

  // Unified balance: money in the wallet + money loaded on the card are both
  // the user's (two pockets, one number). A deposit lands in the wallet, a card
  // top-up moves it to the card — either way the total on the card face is the
  // same. Both are 6-decimal USDC base units.
  const walletRaw = balanceQuery.data ? BigInt(balanceQuery.data) : 0n;
  const cardRaw = card.balance ? BigInt(card.balance) : 0n;
  const balanceKnown = balanceQuery.data != null || card.balance != null;
  const displayBalance = balanceKnown
    ? formatUsd(formatUnits((walletRaw + cardRaw).toString(), chain.stableAsset.decimals))
    : '—';

  const showManagement = flipped && card.isActive;

  const handleFlip = (toBack: boolean) => {
    setFlipped(toBack);
    if (
      toBack &&
      card.isActive &&
      card.activeCardId &&
      !revealed &&
      !reveal.isPending &&
      viewAddress
    ) {
      reveal
        .mutateAsync({ userAddress: viewAddress, cardId: card.activeCardId })
        .then(setRevealed)
        .catch(() => {
          /* leave masked on failure */
        });
    }
  };

  const onRefresh = async () => {
    await Promise.all([
      balanceQuery.refetch(),
      card.refetch(),
      cardTx.refetch(),
    ]);
  };

  return (
    <Screen onRefresh={onRefresh}>
      <View style={styles.header}>
        <ThemedText type="subtitle">Home</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Account and settings"
          onPress={() => router.push('/profile')}>
          <Avatar initial={identity.initial} size={40} />
        </Pressable>
      </View>

      <VisaCard
        balance={displayBalance}
        last4={card.last4}
        pan={revealed?.pan}
        expiry={revealed?.expiry}
        cvc={revealed?.cvc}
        onFlip={handleFlip}
        revealing={reveal.isPending}
      />

      {card.isActive ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.tapHint}>
          {showManagement
            ? 'Tap the card to go back.'
            : 'Tap the card to reveal your number and manage it.'}
        </ThemedText>
      ) : null}

      {showManagement ? (
        <CardManagement address={viewAddress as string} balance={card.balance} />
      ) : (
        <>
          <View style={styles.actions}>
            <Button title="Add funds" onPress={() => setSheet('add')} style={styles.actionBtn} />
            <Button
              title="Send"
              variant="secondary"
              onPress={() => setSheet('send')}
              style={styles.actionBtn}
            />
          </View>

          {/* Setup prompt only until the card exists — once active, the card
              itself (flip) is the entry to management. */}
          {!card.isActive ? <CardHomeEntry address={viewAddress} /> : null}

          {/* Weekly top-up + Total invested now live on the Earn tab. */}
          <ActivityScreen limit={5} onViewAll={() => router.push('/activity')} />
        </>
      )}

      <AddMoneySheet visible={sheet === 'add'} onClose={() => setSheet(null)} />
      <SendSheet visible={sheet === 'send'} onClose={() => setSheet(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tapHint: { textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: { flex: 1 },
});
