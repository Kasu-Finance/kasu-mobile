import { useMutation } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';

import { api } from '@/lib/api/client';
import { queryClient } from '@/lib/query/query-client';

import {
  cardKeys,
  type CardOnboardRequest,
  type CardOnboardResponse,
} from './types';

type OnboardInput = {
  userAddress: string;
  email?: string;
};

/**
 * `POST /mobile/card/onboard` — starts Gnosis Pay card onboarding. Returns a
 * hosted `onboardingUrl`. This hook only fetches the URL; opening it is left to
 * the caller's flow:
 *   - `openOnboarding()` opens the URL in an in-app browser via
 *     `expo-web-browser` and, on return, invalidates the cached status so a
 *     mounted `useCardStatus(address)` refetches the authoritative state.
 *   - alternatively, the caller can route to `/card` (a WebView host) with the
 *     returned URL.
 *
 * Note: a returned URL / closed browser means "the user left the flow", not
 * "the card is active" — we always re-read status from the backend afterwards.
 */
export function useCardOnboard() {
  const mutation = useMutation({
    mutationFn: async (input: OnboardInput): Promise<CardOnboardResponse> => {
      const body: CardOnboardRequest = {
        userAddress: input.userAddress,
        ...(input.email ? { email: input.email } : {}),
      };
      const res = await api.post<CardOnboardResponse>('/mobile/card/onboard', body);
      return res.data;
    },
  });

  /** Invalidate the wallet's card status so the UI refetches. */
  const invalidateStatus = (address?: string | null) => {
    if (address) {
      void queryClient.invalidateQueries({ queryKey: cardKeys.status(address) });
    } else {
      void queryClient.invalidateQueries({ queryKey: cardKeys.all });
    }
  };

  /**
   * Convenience: fetch the onboarding URL, open it in an in-app browser, then
   * invalidate status on return. Returns the URL it opened (or null on miss).
   */
  const openOnboarding = async (input: OnboardInput): Promise<string | null> => {
    const { onboardingUrl } = await mutation.mutateAsync(input);
    if (!onboardingUrl) return null;
    try {
      await WebBrowser.openBrowserAsync(onboardingUrl);
    } finally {
      invalidateStatus(input.userAddress);
    }
    return onboardingUrl;
  };

  return {
    ...mutation,
    openOnboarding,
    invalidateStatus,
  };
}
