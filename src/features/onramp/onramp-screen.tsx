import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ACCENT } from '@/components/ui/theme-extras';
import { formatUnits } from '@/lib/format';
import { DEFAULT_CHAIN_ID, getChain } from '@/lib/web3/chains';
import { useStableBalance } from '@/lib/web3/use-balance';
import { useTheme } from '@/hooks/use-theme';

import { AddFunds } from './add-funds';
import { BankAccounts } from './bank-accounts';
import { OffRamp } from './off-ramp';
import { useWayexSession } from './use-wayex-session';

type Tab = 'add' | 'withdraw' | 'accounts';

const TABS: ReadonlyArray<{ key: Tab; label: string }> = [
  { key: 'add', label: 'Add funds' },
  { key: 'withdraw', label: 'Withdraw' },
  { key: 'accounts', label: 'Accounts' },
];

/**
 * Entry screen for the Wayex fiat on/off-ramp. Surfaces the wallet's stable
 * (USDC) balance and a three-way switch into:
 *   - Add funds (on-ramp, `add-funds.tsx`),
 *   - Withdraw (off-ramp, `off-ramp.tsx`),
 *   - Accounts (manage bank accounts, `bank-accounts.tsx`).
 *
 * Mounted into the Card tab during integration.
 */
export default function OnrampScreen() {
  const theme = useTheme();
  const { address, hasSession } = useWayexSession();
  const chain = getChain(DEFAULT_CHAIN_ID);
  const balanceQuery = useStableBalance(address, DEFAULT_CHAIN_ID);
  const [tab, setTab] = useState<Tab>('add');

  const balance = balanceQuery.data
    ? formatUnits(balanceQuery.data, chain.stableAsset.decimals)
    : '0';

  return (
    <Screen>
      <ThemedText type="subtitle">Funds</ThemedText>

      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          {chain.stableAsset.symbol} balance · {chain.name}
        </ThemedText>
        <ThemedText type="title" style={styles.balance}>
          {balance} {chain.stableAsset.symbol}
        </ThemedText>
      </Card>

      <View style={styles.tabs}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              accessibilityRole="button"
              onPress={() => setTab(t.key)}
              style={[
                styles.tab,
                {
                  backgroundColor: active
                    ? ACCENT
                    : theme.backgroundElement,
                },
              ]}>
              <ThemedText
                type="small"
                style={{ color: active ? '#241a0c' : theme.text }}>
                {t.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.body}>
        {tab === 'add' && <AddFunds />}
        {tab === 'withdraw' && <OffRamp />}
        {tab === 'accounts' && <BankAccounts enabled={hasSession} />}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  balance: { fontSize: 36, lineHeight: 42 },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  body: { gap: 12 },
});
