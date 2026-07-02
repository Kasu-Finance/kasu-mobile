import { useMutation } from '@tanstack/react-query';

import { api } from '@/lib/api/client';

import type {
  CardPanTokenResponse,
  CardSecureDetails,
} from './types';

export interface RevealedCard {
  pan: string | null;
  /** MMYY for display, derived from Immersve's expiry object. */
  expiry: string | null;
  cvc: string | null;
  embossedName: string | null;
}

function formatExpiry(expiry: CardSecureDetails['expiry']): string | null {
  if (!expiry) return null;
  if (typeof expiry === 'string') return expiry;
  const month = String(expiry.month ?? '').padStart(2, '0');
  const year = String(expiry.year ?? '').slice(-2);
  return month && year ? `${month}/${year}` : null;
}

/**
 * Reveals the real PAN/CVC for a card. Two-step, PCI-shaped:
 *   1. backend mints a SINGLE-USE `callbackUrl` (POST /mobile/card/pan-token)
 *   2. the APP fetches that URL directly from Immersve's secure host —
 *      card numbers never transit the Kasu backend.
 *
 * The URL is one-shot and time-limited: fetching twice 403s, so callers keep
 * the revealed value in component state and mint a fresh token per reveal.
 */
export function useCardPanReveal() {
  return useMutation({
    mutationFn: async (input: {
      userAddress: string;
      cardId: string;
    }): Promise<RevealedCard> => {
      const tok = await api.post<CardPanTokenResponse>('/mobile/card/pan-token', {
        userAddress: input.userAddress,
        cardId: input.cardId,
      });
      const res = await fetch(tok.data.callbackUrl);
      if (!res.ok) {
        throw new Error(`Secure card fetch failed (HTTP ${res.status})`);
      }
      const details = (await res.json()) as CardSecureDetails;
      return {
        pan: details.pan ?? null,
        expiry: formatExpiry(details.expiry),
        cvc: details.cvv2 ?? null,
        embossedName: details.embossedName ?? null,
      };
    },
  });
}
