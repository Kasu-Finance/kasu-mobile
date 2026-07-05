/**
 * Public surface of the Immersve card feature (F6).
 *
 * `CardScreen` is the default entry, mounted into the Card tab alongside the
 * on-ramp "Add funds" flow during integration:
 *   import { CardScreen } from '@/features/card';
 */
export { default as CardScreen } from './card-screen';
export { CardHomeEntry } from './card-home-entry';
export { CardManagement } from './card-management';
export { CardOnboardWebView } from './card-onboard-webview';
export type { CardOnboardWebViewProps } from './card-onboard-webview';

export { useCardStatus } from './use-card-status';
export { useEnsureCardSession } from './use-card-session';
export { useCardOnboard, type OnboardStep } from './use-card-onboard';
export { useCardTopup } from './use-card-topup';
export { useCardTransactions } from './use-card-transactions';
export { useCardPanReveal, type RevealedCard } from './use-card-pan';
export { useSimulatePurchase, useSeedDemoCard } from './use-card-demo';

export {
  cardKeys,
  isCardActive,
  toUiStatus,
  CARD_RETRY_STATUSES,
  type CardBackendStatus,
  type CardStatus,
  type CardStatusResponse,
  type CardStatusResult,
  type CardSummary,
  type CardSessionInitResponse,
  type CardSessionCompleteResponse,
  type CardCreateResponse,
  type CardPanTokenResponse,
  type CardSecureDetails,
  type CardTopupRequest,
  type CardTopupResponse,
  type CardTransactionItem,
} from './types';
