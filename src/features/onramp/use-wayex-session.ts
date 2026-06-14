import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '@/lib/api/client';
import {
  clearWayexSession,
  getWayexSession,
  setWayexSession,
} from '@/lib/secure/session-store';
import { useEthersSigner } from '@/lib/web3/use-ethers-signer';

import { wayexKeys } from './query-keys';
import type { WayexSessionRequest, WayexSessionResponse } from './types';

/**
 * The exact string the wallet signs to open a Wayex session.
 *
 * MUST stay byte-for-byte identical to `buildSessionMessage` in
 * `kasu-backend/src/wayex/wayex.session.ts` (lines 24-33), or the backend's
 * signature check fails. The same value is mirrored client-side in the web app
 * (`kasu-ui/.../use-wayex-session.ts#buildWayexSessionMessage`).
 *
 * Format (newline-joined):
 *   Kasu Wayex session
 *   address: <lowercased address>
 *   timestamp: <unix timestamp>
 */
export function buildWayexSessionMessage(
  address: string,
  timestamp: number,
): string {
  return [
    'Kasu Wayex session',
    `address: ${address.toLowerCase()}`,
    `timestamp: ${timestamp}`,
  ].join('\n');
}

/**
 * POSTs a freshly-signed session challenge to `/wayex/session`, stores the
 * returned token in secure storage (so `api` auto-attaches `x-wayex-session`
 * on subsequent `/wayex/*` calls), and returns the session response.
 */
async function openSession(args: {
  signMessage: (message: string) => Promise<string>;
  address: string;
  email?: string;
}): Promise<WayexSessionResponse> {
  const timestamp = Date.now();
  const message = buildWayexSessionMessage(args.address, timestamp);
  const signature = await args.signMessage(message);

  const body: WayexSessionRequest = {
    address: args.address,
    signature,
    timestamp,
    email: args.email,
  };
  const res = await api.post<WayexSessionResponse>('/wayex/session', body);
  await setWayexSession(res.data.token);
  return res.data;
}

/**
 * Wallet-bound Wayex session bootstrap.
 *
 * Exposes:
 *  - `connect()` — sign the challenge and exchange it for a session token
 *    (idempotent; safe to call when a token already exists — it refreshes it).
 *  - `ensureSession()` — returns an existing stored token, or opens a new
 *    session if none is present. Used by the on/off-ramp flows before any
 *    authenticated `/wayex/*` call.
 *  - `clear()` — drop the stored token (call on wallet change / sign-out).
 *  - `hasSession` — whether a token is currently in secure storage.
 */
export function useWayexSession() {
  const { signer, address, ready } = useEthersSigner();
  const queryClient = useQueryClient();
  const [hasSession, setHasSession] = useState(false);

  // Hydrate `hasSession` from secure storage on mount.
  useEffect(() => {
    let cancelled = false;
    void getWayexSession().then((token) => {
      if (!cancelled) setHasSession(Boolean(token));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      if (!signer) throw new Error('Connect a wallet first.');
      return signer.signMessage(message);
    },
    [signer],
  );

  const connectMutation = useMutation({
    mutationFn: async (): Promise<WayexSessionResponse> => {
      if (!address) throw new Error('Connect a wallet first.');
      return openSession({ signMessage, address });
    },
    onSuccess: () => {
      setHasSession(true);
      void queryClient.invalidateQueries({ queryKey: wayexKeys.all });
    },
  });

  // `connectMutation` is recreated each render but `mutateAsync` is stable;
  // hold the latest in a ref so `ensureSession` keeps a stable identity.
  const connectAsyncRef = useRef(connectMutation.mutateAsync);
  connectAsyncRef.current = connectMutation.mutateAsync;

  /**
   * Returns a valid session token, opening one if needed. Resolves to the
   * stored token (no network) when present; otherwise signs + POSTs and
   * returns the new token.
   */
  const ensureSession = useCallback(async (): Promise<string> => {
    const existing = await getWayexSession();
    if (existing) {
      setHasSession(true);
      return existing;
    }
    const res = await connectAsyncRef.current();
    return res.token;
  }, []);

  const clear = useCallback(async (): Promise<void> => {
    await clearWayexSession();
    setHasSession(false);
    await queryClient.invalidateQueries({ queryKey: wayexKeys.all });
  }, [queryClient]);

  return {
    /** Whether the wallet/signer is ready to produce a signature. */
    ready: ready && Boolean(signer),
    address,
    hasSession,
    connect: connectMutation.mutateAsync,
    isConnecting: connectMutation.isPending,
    connectError: connectMutation.error as Error | null,
    ensureSession,
    clear,
  };
}
