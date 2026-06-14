import { QueryClient } from '@tanstack/react-query';

/**
 * Shared TanStack Query client. Mirrors the web app's defaults
 * (`kasu-ui` privy-provider): 5-min stale time, no refetch churn, retry reads.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 3,
    },
    mutations: {
      retry: 0,
    },
  },
});
