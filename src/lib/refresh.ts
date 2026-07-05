import { queryClient } from '@/lib/query/query-client';

/**
 * The app's money-reload bus.
 *
 * All financial data (wallet balance, lending strategies + portfolio, card
 * status + transactions, activity feed) flows through TanStack Query, so
 * invalidating the relevant query keys IS the event bus: every mounted screen
 * that reads them refetches automatically.
 *
 * Call `refreshFinancials()` after any action that can change a balance — a
 * deposit arriving, a send, a lend/withdraw, a card top-up or purchase. Pass
 * the address to target the card queries precisely; omit it to sweep all.
 *
 * Query-key roots are duplicated here as literals (kept in sync with the
 * feature hooks) so this coordination util has no dependency on the features.
 */
const KEY = {
  balance: 'stable-balance', // useStableBalance
  lending: 'lending', // lendingKeys.all
  card: 'mobile', // cardKeys.* → ['mobile','card',...]
  activity: 'activity', // useTransactionHistory
} as const;

/** Reload everything money-related. Safe to call from anywhere. */
export function refreshFinancials(): void {
  queryClient.invalidateQueries({
    predicate: (q) => {
      const root = q.queryKey[0];
      return (
        root === KEY.balance ||
        root === KEY.lending ||
        root === KEY.card ||
        root === KEY.activity
      );
    },
  });
}

/** Just the spendable balance (wallet + card funding). */
export function refreshBalance(): void {
  queryClient.invalidateQueries({
    predicate: (q) =>
      q.queryKey[0] === KEY.balance ||
      (q.queryKey[0] === KEY.card && q.queryKey[2] === 'status'),
  });
}
