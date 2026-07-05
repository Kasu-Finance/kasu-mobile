import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery } from '@tanstack/react-query';

import { queryClient } from '@/lib/query/query-client';

/**
 * Local card preferences (the spending limit chosen at activation). Immersve
 * has no partner-facing spend-limit endpoint, so this is stored on-device and
 * surfaced in the UI — a real, persisted choice for the demo.
 */
const limitKey = (address: string) =>
  `card:spending-limit:${address.toLowerCase()}`;

const prefsKeys = {
  limit: (address: string) => ['card', 'spending-limit', address.toLowerCase()],
};

export function useSpendingLimit(address: string | null | undefined) {
  return useQuery({
    queryKey: address ? prefsKeys.limit(address) : ['card', 'spending-limit', 'noop'],
    enabled: Boolean(address),
    queryFn: () => AsyncStorage.getItem(limitKey(address as string)),
  });
}

export function useSetSpendingLimit() {
  return useMutation({
    mutationFn: async ({ address, limit }: { address: string; limit: string }) => {
      await AsyncStorage.setItem(limitKey(address), limit);
      return limit;
    },
    onSuccess: (_l, { address }) =>
      queryClient.invalidateQueries({ queryKey: prefsKeys.limit(address) }),
  });
}
