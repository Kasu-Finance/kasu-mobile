import { useMutation } from '@tanstack/react-query';
import { Linking } from 'react-native';

import { api } from '@/lib/api/client';
import { queryClient } from '@/lib/query/query-client';
import { useEthersSigner } from '@/lib/web3/use-ethers-signer';

import {
  cardKeys,
  type CardCreateResponse,
  type CardSessionCompleteResponse,
  type CardSessionInitResponse,
  type CardStatusResponse,
} from './types';

type OnboardInput = {
  userAddress: string;
  email?: string;
  phone?: string;
};

/** Which onboarding step `advanceOnboarding()` last executed. */
export type OnboardStep =
  | 'session'
  | 'contact'
  | 'kyc-browser'
  | 'card-created'
  | 'waiting'
  | 'done'
  | 'unavailable';

/**
 * Drives the Immersve onboarding ladder (plan §5 P3):
 *
 *   session-required → SIWE handshake (Privy embedded EOA signs the message)
 *   kyc-required     → submit contact details, then open the hosted KYC URL
 *   ready            → create the virtual card
 *   active           → done
 *
 * Each call to `advanceOnboarding()` performs the NEXT step and returns it;
 * the UI simply re-reads `useCardStatus()` afterwards (we invalidate it).
 * The SIWE signature comes from the Privy embedded EOA — Immersve rejects
 * smart-account signatures (plan §3.1).
 */
export function useCardOnboard() {
  const { signer } = useEthersSigner();

  const mutation = useMutation({
    mutationFn: async (input: OnboardInput): Promise<OnboardStep> => {
      const address = input.userAddress;
      const status = await fetchStatus(address);

      switch (status.status) {
        case 'session-required': {
          if (!signer) {
            throw new Error('Wallet not ready — cannot sign the card login');
          }
          const init = await api.post<CardSessionInitResponse>(
            '/mobile/card/session/init',
            { userAddress: address },
          );
          const signature = await signer.signMessage(init.data.message);
          await api.post<CardSessionCompleteResponse>(
            '/mobile/card/session/complete',
            {
              userAddress: address,
              loginRequestId: init.data.loginRequestId,
              signature,
            },
          );
          return 'session';
        }

        case 'kyc-required': {
          // Contact details are a KYC prerequisite — submit when provided.
          if (input.email || input.phone) {
            await api.post('/mobile/card/contact', {
              userAddress: address,
              email: input.email,
              phone: input.phone,
            });
          }
          const kycUrl =
            status.kycUrl ?? (await fetchStatus(address)).kycUrl ?? null;
          if (!kycUrl) return 'waiting';
          // Open in the full system browser (not the in-app Safari sheet):
          // its toolbar collapses on scroll, so the hosted KYC's sticky
          // submit button stays reachable, and the camera liveness step works
          // natively. The user returns to the app manually; status polling
          // picks up completion.
          await Linking.openURL(kycUrl);
          return 'kyc-browser';
        }

        case 'ready': {
          await api.post<CardCreateResponse>('/mobile/card/create', {
            userAddress: address,
          });
          return 'card-created';
        }

        case 'active':
          return 'done';

        case 'kyc-pending':
        case 'blocked':
          return 'waiting';

        default:
          return 'unavailable';
      }
    },
    onSettled: (_res, _err, input) => {
      invalidateStatus(input?.userAddress);
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
   * Back-compat convenience used by the Card screen CTA: advance the flow.
   * Returns the step performed (or null when nothing could be done).
   */
  const openOnboarding = async (input: OnboardInput): Promise<string | null> => {
    const step = await mutation.mutateAsync(input);
    return step === 'unavailable' ? null : step;
  };

  return {
    ...mutation,
    advanceOnboarding: mutation.mutateAsync,
    openOnboarding,
    invalidateStatus,
  };
}

async function fetchStatus(
  userAddress: string,
): Promise<Partial<CardStatusResponse>> {
  const res = await api.get<Partial<CardStatusResponse>>('/mobile/card/status', {
    params: { userAddress: userAddress.toLowerCase() },
  });
  return res.data ?? {};
}
