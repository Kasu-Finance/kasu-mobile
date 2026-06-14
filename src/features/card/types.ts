/**
 * Shared types + query keys for the Gnosis Pay card feature (F6).
 *
 * The backend contract (with a sandbox fallback) is:
 *   - POST /mobile/card/onboard  { userAddress, email? } -> { onboardingUrl }
 *   - GET  /mobile/card/status?userAddress=             -> { status, last4? }
 *   - POST /mobile/card/topup    { userAddress, amount } -> { txHash?, accepted }
 */

/**
 * Normalized card lifecycle status returned by `GET /mobile/card/status`.
 *
 * `'none'` is the safe default for a wallet that has never started card
 * onboarding — and the value we coerce errors/501s into so a partially-built
 * backend degrades gracefully to "not onboarded, can start".
 */
export type CardStatus = 'none' | 'pending' | 'active' | 'frozen' | 'rejected';

/** Raw response shape of `GET /mobile/card/status`. */
export interface CardStatusResponse {
  status: CardStatus;
  /** Last four PAN digits — only present once a card is issued. */
  last4?: string | null;
}

/** Normalized status result consumed by the UI/hooks. */
export interface CardStatusResult {
  status: CardStatus;
  last4: string | null;
}

/** Request body for `POST /mobile/card/onboard`. */
export interface CardOnboardRequest {
  userAddress: string;
  /** Optional pre-fill for the Gnosis Pay onboarding flow. */
  email?: string;
}

/** Response of `POST /mobile/card/onboard`. */
export interface CardOnboardResponse {
  /** Hosted Gnosis Pay onboarding URL to open in a browser / WebView. */
  onboardingUrl: string;
}

/** Request body for `POST /mobile/card/topup`. */
export interface CardTopupRequest {
  userAddress: string;
  /** Human-entered amount (e.g. "25.00"). Backend interprets the unit. */
  amount: string;
}

/** Response of `POST /mobile/card/topup`. */
export interface CardTopupResponse {
  /** On-chain tx hash when the top-up was settled on-chain server-side. */
  txHash?: string | null;
  /** True when the top-up request was accepted (queued or settled). */
  accepted: boolean;
}

/** Statuses where the user can (re)start onboarding. */
export const CARD_RETRY_STATUSES: ReadonlySet<CardStatus> = new Set<CardStatus>([
  'none',
  'rejected',
]);

/** True only when the wallet has a live, spendable card. */
export function isCardActive(status: CardStatus): boolean {
  return status === 'active';
}

/** TanStack Query keys for the card feature; exported so routes can invalidate. */
export const cardKeys = {
  all: ['mobile', 'card'] as const,
  status: (address: string) =>
    ['mobile', 'card', 'status', address.toLowerCase()] as const,
};
