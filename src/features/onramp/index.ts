/**
 * Public surface of the Wayex on/off-ramp feature.
 *
 * `OnrampScreen` is the default entry (mounted into the Card tab). The hooks +
 * sub-screens are exported for direct composition.
 */
export { default as OnrampScreen } from './onramp-screen';
export { AddFunds } from './add-funds';
export { OffRamp } from './off-ramp';
export { BankAccounts } from './bank-accounts';
export { KycGate } from './kyc-gate';

export {
  buildWayexSessionMessage,
  useWayexSession,
} from './use-wayex-session';
export { useStartVerification, useWayexIdentity } from './use-wayex-identity';
export { useAddBankAccount, useBankAccounts } from './use-bank-accounts';
export { useDepositFiat } from './use-deposit-fiat';

export {
  isWayexReady,
  WAYEX_PENDING_KYC_STATUSES,
  type WayexBankAccountAddResponse,
  type WayexBankAccountListResponse,
  type WayexDepositFiatResponse,
  type WayexExternalAccount,
  type WayexIdentity,
  type WayexKycStatus,
  type WayexSessionResponse,
  type WayexTosStatus,
} from './types';
