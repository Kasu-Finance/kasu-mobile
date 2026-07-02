/**
 * Shared types + query keys for the Immersve card feature (F6).
 *
 * Backend contract (kasu-backend `/mobile/card/*`, Immersve public sandbox):
 *   - POST /mobile/card/session/init     { userAddress } -> { loginRequestId, message, mode? }
 *   - POST /mobile/card/session/complete { userAddress, loginRequestId, signature } -> { cardholderAccountId }
 *   - GET  /mobile/card/status?userAddress= -> { status, balance?, kycUrl?, cards?, … }
 *   - POST /mobile/card/contact          { userAddress, email?, phone? } -> status
 *   - POST /mobile/card/create           { userAddress } -> { cardId, status? }
 *   - POST /mobile/card/pan-token        { userAddress, cardId } -> { callbackUrl }
 *   - POST /mobile/card/topup            { userAddress, amount } -> { mode, accepted?, depositAddress? }
 *   - GET  /mobile/card/transactions?userAddress= -> { items }
 *
 * The app signs the Immersve SIWE challenge with the Privy embedded EOA
 * (smart-account signatures are rejected by Immersve — plan §3.1); PAN/CVC
 * are fetched by the APP straight from the single-use `callbackUrl` (PCI).
 */

/** Raw onboarding state machine as reported by the backend. */
export type CardBackendStatus =
  | 'none' // backend not configured for Immersve
  | 'session-required' // app must run the SIWE handshake
  | 'kyc-required' // open kycUrl in a browser/WebView
  | 'kyc-pending' // KYC/AML review in progress
  | 'blocked'
  | 'ready' // prerequisites met — can create a card
  | 'active'; // has an active card

/**
 * Legacy UI status consumed by `card-screen.tsx`. Backend statuses collapse
 * into this vocabulary via `toUiStatus()`; the richer state machine lives on
 * `CardStatusResult.backendStatus`.
 */
export type CardStatus = 'none' | 'pending' | 'active' | 'frozen' | 'rejected';

export interface CardSummary {
  id: string;
  status?: string;
  maskedPan?: string;
  type?: string;
}

/** Raw response shape of `GET /mobile/card/status`. */
export interface CardStatusResponse {
  status: CardBackendStatus;
  cardholderAccountId?: string;
  /** Card-funding balance in USDC minor units (6 decimals), e.g. "100000000". */
  balance?: string;
  fundingSourceId?: string;
  /** Hosted Immersve KYC URL — open in browser/WebView. */
  kycUrl?: string;
  prerequisites?: {
    stage: string;
    type?: string;
    status: string;
    actionType?: string;
  }[];
  cards?: CardSummary[];
}

/** Normalized status result consumed by the UI/hooks. */
export interface CardStatusResult {
  /** Legacy 5-value status the existing screens key off. */
  status: CardStatus;
  /** Full backend state machine value driving the onboarding flow. */
  backendStatus: CardBackendStatus;
  /** Last four digits of the active card's masked PAN, when issued. */
  last4: string | null;
  balance: string | null;
  kycUrl: string | null;
  cards: CardSummary[];
  activeCardId: string | null;
}

export function toUiStatus(backend: CardBackendStatus): CardStatus {
  switch (backend) {
    case 'active':
      return 'active';
    case 'kyc-pending':
    case 'blocked':
      return 'pending';
    // session-required / kyc-required / ready are all "onboarding not done"
    // from the legacy screen's point of view — the CTA (re)starts the flow.
    default:
      return 'none';
  }
}

// ------------------------------------------------------------- handshake ---

export interface CardSessionInitResponse {
  loginRequestId: string;
  /** SIWE message (EIP-4361) the Privy embedded wallet must sign. */
  message: string;
  mode?: string;
}

export interface CardSessionCompleteResponse {
  cardholderAccountId: string;
}

// ---------------------------------------------------------------- actions ---

export interface CardCreateResponse {
  cardId: string;
  status?: string;
}

export interface CardPanTokenResponse {
  /** Single-use URL the app fetches DIRECTLY for {pan, expiry, cvv2}. */
  callbackUrl: string;
}

/** Payload returned by Immersve's secure host when fetching `callbackUrl`. */
export interface CardSecureDetails {
  pan?: string;
  cvv2?: string;
  expiry?: { month?: string | number; year?: string | number } | string;
  embossedName?: string;
}

/** Request body for `POST /mobile/card/topup`. */
export interface CardTopupRequest {
  userAddress: string;
  /** Human-entered amount in USDC display units (e.g. "25.00"). */
  amount: string;
}

/** Response of `POST /mobile/card/topup`. */
export interface CardTopupResponse {
  /** simulator = executed server-side (test env); onchain = app must send USDC. */
  mode: 'simulator' | 'onchain' | 'unavailable';
  accepted?: boolean;
  /** Funds Storage address to send USDC to when mode === 'onchain'. */
  depositAddress?: string;
}

export interface CardTransactionItem {
  id: string;
  status?: string;
  type?: string;
  amount?: string;
  currency?: string;
  merchantName?: string;
  createdAt?: string;
}

// ------------------------------------------------------------------ misc ---

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
  transactions: (address: string) =>
    ['mobile', 'card', 'transactions', address.toLowerCase()] as const,
};
