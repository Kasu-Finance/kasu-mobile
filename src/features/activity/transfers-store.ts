import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';

import { formatUsd, shortAddress } from '@/lib/format';
import { queryClient } from '@/lib/query/query-client';

import type { ActivityItem } from './types';

/**
 * Money in/out (deposits received, sends made) that the app observes itself.
 *
 * The activity feed's other sources are Kasu lending (SDK) and card purchases
 * (Immersve) — neither covers a plain wallet transfer. Rather than pull a full
 * transfer history from an indexer, we log the movements the app already knows
 * about: a send it just made, and a deposit it detected on the deposit screen.
 * Persisted per address in AsyncStorage. (A complete incoming-transfer history
 * would need an indexer — future.)
 */
export interface LocalTransfer {
  id: string;
  kind: 'received' | 'sent';
  /** Dollars, e.g. "50.00". */
  amount: string;
  /** Recipient address, for sends. */
  counterparty?: string;
  /** Unix seconds. */
  timestamp: number;
}

const storeKey = (a: string) => `transfers:${a.toLowerCase()}`;
const queryKey = (a: string) => ['transfers', a.toLowerCase()];
const MAX = 50;

async function readTransfers(address: string): Promise<LocalTransfer[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(storeKey(address))) ?? '[]');
  } catch {
    return [];
  }
}

/** Append a transfer and refresh the feed. */
export async function recordTransfer(
  address: string,
  t: Pick<LocalTransfer, 'kind' | 'amount' | 'counterparty'>,
): Promise<void> {
  const list = await readTransfers(address);
  const entry: LocalTransfer = {
    ...t,
    id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    timestamp: Math.floor(Date.now() / 1000),
  };
  await AsyncStorage.setItem(
    storeKey(address),
    JSON.stringify([entry, ...list].slice(0, MAX)),
  );
  void queryClient.invalidateQueries({ queryKey: queryKey(address) });
}

export function useLocalTransfers(address: string | null | undefined) {
  return useQuery<LocalTransfer[]>({
    queryKey: address ? queryKey(address) : ['transfers', 'noop'],
    enabled: Boolean(address),
    queryFn: () => readTransfers(address as string),
  });
}

/** Map a logged transfer into a feed row. */
export function localTransferToActivityItem(t: LocalTransfer): ActivityItem {
  const received = t.kind === 'received';
  const amount = Number(t.amount || '0');
  return {
    id: `transfer-${t.id}`,
    kind: received ? 'deposit' : 'withdrawal',
    title: received ? 'Money received' : 'Money sent',
    subtitle: received
      ? 'Added to your balance'
      : t.counterparty
        ? `To ${shortAddress(t.counterparty)}`
        : 'Sent',
    timestamp: t.timestamp,
    amount: `${received ? '+' : '-'}${formatUsd(amount)}`,
    positive: received,
    status: 'Completed',
    details: [
      { label: received ? 'From' : 'To', value: received ? 'External account' : shortAddress(t.counterparty) },
      { label: 'Amount', value: formatUsd(amount) },
      { label: 'Status', value: 'Completed' },
    ],
  };
}
