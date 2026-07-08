import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { AmountKeypad } from '@/features/onramp/amount-keypad';
import { useTheme } from '@/hooks/use-theme';
import { formatUnits } from '@/lib/format';
import { DEFAULT_CHAIN_ID, getChain } from '@/lib/web3/chains';
import { useStableBalance } from '@/lib/web3/use-balance';
import { useViewAddress } from '@/lib/web3/use-view-address';

/** 1 Point = $0.10. */
const RATE_USD_PER_POINT = 0.1;

const PRESETS: [string, number][] = [
  ['25%', 0.25],
  ['50%', 0.5],
  ['75%', 0.75],
  ['100%', 1],
];

/**
 * Buy points — Plasma's Convert screen (USD → Points) with our Kasu mark.
 * Reached from Rewards → "Buy points" and the Cashback sheet's "Get more
 * cashback". The keypad drives the USD amount; the Points figure converts live.
 * Continue is a preview (buying points isn't wired yet).
 */
export default function BuyPointsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { viewAddress } = useViewAddress();
  const stable = getChain(DEFAULT_CHAIN_ID).stableAsset;
  const balanceQuery = useStableBalance(viewAddress, DEFAULT_CHAIN_ID);
  const [amount, setAmount] = useState('');

  const available = Number(
    formatUnits(balanceQuery.data ?? '0', stable.decimals, 6).replace(/,/g, ''),
  );
  const points = (Number(amount || '0') / RATE_USD_PER_POINT).toFixed(2);

  return (
    <Screen>
      <ScreenHeader
        title="Buy points"
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/rewards'))}
      />

      <AmountKeypad
        value={amount}
        onChange={setAmount}
        available={available}
        presets={PRESETS}
        continueLabel="Continue"
        disabled
        note="Buying points is coming soon."
        onContinue={() => {}}
        display={
          <View style={styles.convert}>
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.rowTop}>
                <ThemedText type="small" themeColor="textSecondary">
                  From
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Available · ${available.toFixed(2)}
                </ThemedText>
              </View>
              <View style={styles.rowMain}>
                <View style={styles.asset}>
                  <Text style={styles.flag}>🇺🇸</Text>
                  <ThemedText type="subtitle">USD</ThemedText>
                </View>
                <ThemedText type="title" style={styles.value}>
                  {amount || '0'}
                </ThemedText>
              </View>
            </View>

            <View style={[styles.swap, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}>
              <SymbolView name="arrow.up.arrow.down" size={16} tintColor={theme.text} />
            </View>

            <View style={[styles.card, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="small" themeColor="textSecondary">
                To
              </ThemedText>
              <View style={styles.rowMain}>
                <View style={styles.asset}>
                  <Image
                    source={require('../../assets/brand/mark-brass.png')}
                    style={styles.mark}
                    contentFit="contain"
                  />
                  <ThemedText type="subtitle">Points</ThemedText>
                </View>
                <ThemedText type="title" style={styles.value}>
                  {points}
                </ThemedText>
              </View>
            </View>

            <View style={styles.rate}>
              <ThemedText type="small" themeColor="textSecondary">
                Exchange rate
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                1 Point = ${RATE_USD_PER_POINT.toFixed(2)}
              </ThemedText>
            </View>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  convert: { gap: 2 },
  card: { borderRadius: 16, padding: 16, gap: 10 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  asset: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flag: { fontSize: 26 },
  mark: { width: 26, height: 26 },
  value: { fontSize: 26, lineHeight: 32, flexShrink: 1 },
  swap: {
    alignSelf: 'center',
    marginVertical: -14,
    zIndex: 1,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
});
