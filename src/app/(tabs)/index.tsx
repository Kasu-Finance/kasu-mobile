import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ActivityScreen } from '@/features/activity';
import {
  CardHomeEntry,
  CardManagement,
  useCardStatus,
  useCardPanReveal,
  useCardTransactions,
  useSeedDemoCard,
  type RevealedCard,
} from '@/features/card';
import { Screen } from '@/components/ui/screen';
import { ACCENT } from '@/components/ui/theme-extras';
import { VisaCard } from '@/components/ui/visa-card';
import { EpochYield } from '@/features/lending/epoch-yield';
import { Portfolio } from '@/features/lending/portfolio';
import { AddMoneySheet } from '@/features/onramp/add-money-sheet';
import { SendSheet } from '@/features/onramp/send-sheet';
import { WithdrawSheet } from '@/features/onramp/withdraw-sheet';
import { useTheme } from '@/hooks/use-theme';
import { formatUnits } from '@/lib/format';
import { DEFAULT_CHAIN_ID, getChain } from '@/lib/web3/chains';
import { useStableBalance } from '@/lib/web3/use-balance';
import { useViewAddress } from '@/lib/web3/use-view-address';

type Sheet = 'add' | 'withdraw' | 'send' | null;

/**
 * Home: neobank dashboard. The card is the hero — tapping it flips it to reveal
 * the real number and swaps the content below for card management (top up +
 * card activity). Flipping back returns to the account view.
 */
export default function HomeScreen() {
  const router = useRouter();
  const { viewAddress } = useViewAddress();
  const chain = getChain(DEFAULT_CHAIN_ID);
  const { data: balance, isLoading } = useStableBalance(viewAddress, DEFAULT_CHAIN_ID);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [flipped, setFlipped] = useState(false);

  const card = useCardStatus(viewAddress);
  const cardTx = useCardTransactions(viewAddress);
  const reveal = useCardPanReveal();
  const [revealed, setRevealed] = useState<RevealedCard | null>(null);

  // Fund + seed a realistic history the first time the card is active.
  useSeedDemoCard(viewAddress, card.isActive, cardTx.data?.length ?? 0, cardTx.isLoading);

  const balanceText =
    isLoading || balance == null
      ? '—'
      : `$${formatUnits(balance, chain.stableAsset.decimals)}`;

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

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Home</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profile"
          onPress={() => router.push('/profile')}
          style={[styles.avatar, { backgroundColor: ACCENT }]}>
          <Text style={styles.avatarGlyph}>◉</Text>
        </Pressable>
      </View>

      <VisaCard
        balance={balanceText}
        last4={card.last4}
        pan={revealed?.pan}
        expiry={revealed?.expiry}
        cvc={revealed?.cvc}
        onFlip={handleFlip}
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
          {/* Balance under the card, then the primary CTA. */}
          <View style={styles.balanceBlock}>
            <ThemedText type="small" themeColor="textSecondary">
              BALANCE
            </ThemedText>
            <ThemedText type="title">{balanceText}</ThemedText>
          </View>

          <Button title="Add money" onPress={() => setSheet('add')} />

          <View style={styles.actions}>
            <ActionButton label="Withdraw" glyph="↓" onPress={() => setSheet('withdraw')} />
            <ActionButton label="Send" glyph="↗" onPress={() => setSheet('send')} />
            <ActionButton label="Activity" glyph="≡" onPress={() => router.push('/activity')} />
          </View>

          {/* Setup prompt only until the card exists — once active, the card
              itself (flip) is the entry to management. */}
          {!card.isActive ? <CardHomeEntry address={viewAddress} /> : null}

          {/* The product hook: interest tops up the card every Thursday. */}
          <EpochYield />

          <Portfolio summaryOnly />

          <ActivityScreen />
        </>
      )}

      <AddMoneySheet visible={sheet === 'add'} onClose={() => setSheet(null)} />
      <WithdrawSheet visible={sheet === 'withdraw'} onClose={() => setSheet(null)} />
      <SendSheet visible={sheet === 'send'} onClose={() => setSheet(null)} />
    </Screen>
  );
}

function ActionButton({
  label,
  glyph,
  onPress,
}: {
  label: string;
  glyph: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.action}>
      <View style={[styles.actionCircle, { backgroundColor: ACCENT }]}>
        <Text style={styles.actionGlyph}>{glyph}</Text>
      </View>
      <ThemedText type="small" style={{ color: theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  balanceBlock: { gap: 2 },
  tapHint: { textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlyph: { fontSize: 16, color: '#241a0c' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  action: { alignItems: 'center', gap: 8, flex: 1 },
  actionCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionGlyph: { fontSize: 24, fontWeight: '600', color: '#241a0c' },
});
