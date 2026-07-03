import { useEffect, useRef } from 'react';

import { api } from '@/lib/api/client';
import { queryClient } from '@/lib/query/query-client';
import { useEthersSigner } from '@/lib/web3/use-ethers-signer';

import {
  cardKeys,
  type CardBackendStatus,
  type CardSessionCompleteResponse,
  type CardSessionInitResponse,
} from './types';

/**
 * Silently establishes the card session the moment the embedded wallet is
 * ready and the backend reports `session-required`.
 *
 * The embedded wallet signs the SIWE challenge programmatically — no prompt,
 * no visible "connect/sign" step — so by the time the user interacts with the
 * card, the flow is already at identity verification. This is what makes the
 * neobank feel like a bank and not a crypto app: the wallet is invisible
 * plumbing.
 *
 * Runs once per mount; a transient failure resets the guard so a later status
 * refresh can retry.
 */
export function useEnsureCardSession(
  address: string | null | undefined,
  backendStatus: CardBackendStatus,
) {
  const { signer } = useEthersSigner();
  const attempted = useRef(false);

  useEffect(() => {
    if (!address || !signer) return;
    if (backendStatus !== 'session-required') return;
    if (attempted.current) return;
    attempted.current = true;

    let cancelled = false;
    (async () => {
      try {
        const init = await api.post<CardSessionInitResponse>(
          '/mobile/card/session/init',
          { userAddress: address },
        );
        const signature = await signer.signMessage(init.data.message);
        if (cancelled) return;
        await api.post<CardSessionCompleteResponse>(
          '/mobile/card/session/complete',
          {
            userAddress: address,
            loginRequestId: init.data.loginRequestId,
            signature,
          },
        );
      } catch {
        // Allow a retry on the next status change (transient network/session).
        attempted.current = false;
      } finally {
        if (!cancelled) {
          void queryClient.invalidateQueries({
            queryKey: cardKeys.status(address),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, signer, backendStatus]);
}
