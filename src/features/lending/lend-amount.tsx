import type { Strategy, StrategyTranche } from '@kasufinance/kasu-sdk';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useKycStatus } from '@/features/kyc/use-kyc-status';
import { AmountKeypad } from '@/features/onramp/amount-keypad';
import { formatApy, formatUnits } from '@/lib/format';
import { useSdk } from '@/lib/sdk/use-sdk';
import { getChain } from '@/lib/web3/chains';
import { useStableBalance } from '@/lib/web3/use-balance';
import { useEthersSigner } from '@/lib/web3/use-ethers-signer';
import { getTrancheDisplayName } from './lib/strategy-display';

/** Lending quick-amount presets (Plasma uses 25 / 50 / 75%). */
const LEND_PRESETS: [string, number][] = [
  ['25%', 0.25],
  ['50%', 0.5],
  ['75%', 0.75],
];

/**
 * The final lending step — Plasma's amount screen: a source chip, a big amount
 * with a custom keypad + 25/50/75% presets, and a "Lend" button.
 *
 * The button is gated on KYC: no mobile user is verified yet, so it stays
 * disabled with a "verify to earn" note. When KYC lands this wires to the
 * deposit flow via `onLend`.
 */
export function LendAmount({
  strategy,
  tranche,
  onLend,
}: {
  strategy: Strategy;
  tranche: StrategyTranche;
  onLend?: (amount: string) => void;
}) {
  const theme = useTheme();
  const { chainId } = useSdk();
  const { address } = useEthersSigner();
  const stable = getChain(chainId).stableAsset;
  const balanceQuery = useStableBalance(address, chainId);
  const kyc = useKycStatus(address);
  const [amount, setAmount] = useState('');

  const available = Number(
    formatUnits(balanceQuery.data ?? '0', stable.decimals, 6).replace(/,/g, ''),
  );

  return (
    <AmountKeypad
      value={amount}
      onChange={setAmount}
      available={available}
      presets={LEND_PRESETS}
      continueLabel="Lend"
      disabled={!kyc.isVerified}
      note={
        kyc.isVerified
          ? undefined
          : 'Verify your identity to start earning — coming soon.'
      }
      header={
        <View style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
          <View style={[styles.chipIcon, { backgroundColor: theme.backgroundSelected }]}>
            <SymbolView name="dollarsign" size={12} tintColor={theme.text} />
          </View>
          <ThemedText type="smallBold">
            {getTrancheDisplayName(tranche.name, strategy.name)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            · {formatApy(tranche.apy)}
          </ThemedText>
        </View>
      }
      onContinue={() => onLend?.(amount)}
    />
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  chipIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
