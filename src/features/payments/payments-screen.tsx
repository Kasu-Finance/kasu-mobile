import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';
import { formatUnits } from '@/lib/format';
import { DEFAULT_CHAIN_ID, getChain } from '@/lib/web3/chains';
import { useEthersSigner } from '@/lib/web3/use-ethers-signer';

import { Receive } from './receive';
import { Request } from './request';
import { Send } from './send';
import type { PaymentHistoryItem } from './types';
import { usePaymentHistory } from './use-payment-history';

type Flow = 'send' | 'receive' | 'request';

const FLOW_TITLES: Record<Flow, string> = {
  send: 'Send',
  receive: 'Receive',
  request: 'Request',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#f5a623',
  paid: '#30a46c',
  expired: '#8b8d98',
  cancelled: '#e4645a',
};

/**
 * Payments hub — entry point for the P2P send / receive / request flows plus a
 * recent-requests list pulled from `GET /mobile/payments/history`.
 *
 * Each sub-flow opens in a modal sheet to keep the foundation's minimal,
 * single-screen aesthetic. Mounted into the Activity tab during integration.
 */
export default function PaymentsScreen({ chainId = DEFAULT_CHAIN_ID }: { chainId?: number }) {
  const theme = useTheme();
  const { address } = useEthersSigner();
  const asset = getChain(chainId).stableAsset;
  const history = usePaymentHistory(address);

  const [flow, setFlow] = useState<Flow | null>(null);

  const items = history.data ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <Button title="Send" style={styles.action} onPress={() => setFlow('send')} />
        <Button
          title="Receive"
          variant="secondary"
          style={styles.action}
          onPress={() => setFlow('receive')}
        />
        <Button
          title="Request"
          variant="secondary"
          style={styles.action}
          onPress={() => setFlow('request')}
        />
      </View>

      <View style={styles.section}>
        <ThemedText type="smallBold">Recent requests</ThemedText>

        {history.isLoading ? (
          <Card style={styles.centered}>
            <ActivityIndicator color={theme.text} />
          </Card>
        ) : history.isError ? (
          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              Couldn&apos;t load your requests. Pull to refresh or try again later.
            </ThemedText>
          </Card>
        ) : items.length === 0 ? (
          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              No payment requests yet. Tap Request to create one.
            </ThemedText>
          </Card>
        ) : (
          items.map((item) => (
            <HistoryRow key={item.id} item={item} fallbackSymbol={asset.symbol} decimals={asset.decimals} />
          ))
        )}
      </View>

      <Modal
        visible={flow !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFlow(null)}>
        <SafeAreaView style={[styles.sheet, { backgroundColor: theme.background }]} edges={['top']}>
          <View style={styles.sheetHeader}>
            <ThemedText type="subtitle">{flow ? FLOW_TITLES[flow] : ''}</ThemedText>
            <Pressable accessibilityRole="button" hitSlop={12} onPress={() => setFlow(null)}>
              <ThemedText type="link" themeColor="textSecondary">
                Close
              </ThemedText>
            </Pressable>
          </View>
          <View style={styles.sheetBody}>
            {flow === 'send' ? <Send chainId={chainId} /> : null}
            {flow === 'receive' ? <Receive chainId={chainId} /> : null}
            {flow === 'request' ? <Request chainId={chainId} /> : null}
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function HistoryRow({
  item,
  fallbackSymbol,
  decimals,
}: {
  item: PaymentHistoryItem;
  fallbackSymbol: string;
  decimals: number;
}) {
  const theme = useTheme();
  const statusColor = STATUS_COLORS[item.status] ?? theme.textSecondary;
  // Backend stores amount as a display string; render as-is, falling back to a
  // base-unit decode if it parses as an integer-only base amount.
  const amountLabel = formatAmount(item.amount, decimals);

  return (
    <Card style={styles.row}>
      <View style={styles.rowMain}>
        <ThemedText type="smallBold">
          {amountLabel} {item.asset || fallbackSymbol}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatDate(item.createdAt)}
        </ThemedText>
      </View>
      <ThemedText type="small" style={{ color: statusColor }}>
        {item.status}
      </ThemedText>
    </Card>
  );
}

/** Render a backend amount string; prefer the display value, fall back gracefully. */
function formatAmount(amount: string, decimals: number): string {
  if (amount == null) return '0';
  // Already a decimal display string (e.g. "25.00") — keep it.
  if (amount.includes('.')) return amount;
  // Heuristic: very long integer-only strings are likely base units.
  if (/^\d+$/.test(amount) && amount.length > decimals) {
    return formatUnits(amount, decimals);
  }
  return amount;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: { gap: 20 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, paddingHorizontal: 8 },
  section: { gap: 8 },
  centered: { alignItems: 'center', justifyContent: 'center', minHeight: 64 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowMain: { gap: 2 },
  sheet: { flex: 1 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sheetBody: { padding: 20, gap: 16 },
});
