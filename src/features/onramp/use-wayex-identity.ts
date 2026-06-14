import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';

import { wayexKeys } from './query-keys';
import type { WayexIdentity, WayexVerifyRequest } from './types';

/**
 * `GET /wayex/identity` — the user's Wayex KYC/ToS status + hosted links.
 *
 * Gated on `enabled` (the caller passes `hasSession`) so we never hit the
 * authenticated route before a session token exists (the backend's
 * `WayexSessionGuard` would 401).
 */
export function useWayexIdentity(enabled: boolean) {
  return useQuery({
    queryKey: wayexKeys.identity(),
    enabled,
    queryFn: async (): Promise<WayexIdentity> => {
      const res = await api.get<WayexIdentity>('/wayex/identity');
      return res.data;
    },
  });
}

/**
 * `POST /wayex/verify` — kicks off Persona KYC and returns the refreshed
 * identity, including the hosted `kycLink` to open in a WebView / browser.
 * Invalidates the identity cache so the next read reflects the new status.
 */
export function useStartVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: WayexVerifyRequest): Promise<WayexIdentity> => {
      const res = await api.post<WayexIdentity>('/wayex/verify', input);
      return res.data;
    },
    onSuccess: (identity) => {
      queryClient.setQueryData(wayexKeys.identity(), identity);
      void queryClient.invalidateQueries({ queryKey: wayexKeys.identity() });
    },
  });
}
