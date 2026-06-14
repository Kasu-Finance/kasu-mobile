/**
 * Payments types — mirrors the backend contract in
 * `kasu-backend/src/mobile/payments/mobile-payments.types.ts`.
 *
 * Kept local to the feature so the app side stays decoupled from the NestJS
 * DTO classes (decorators / Swagger) that live server-side.
 */

/** Status of a payment request, per backend `MobilePaymentHistoryItemDto`. */
export type PaymentStatus = 'pending' | 'paid' | 'expired' | 'cancelled';

/** Body of `POST /mobile/payments/request`. */
export interface PaymentRequestBody {
  requesterAddress: string;
  /** Amount in stable-asset display units, as a string (e.g. "25.00"). */
  amount: string;
  /** Asset symbol, e.g. "USDC". */
  asset: string;
  /** Optional payer email to notify. */
  payerEmail?: string;
  /** Optional memo. */
  note?: string;
}

/** Response of `POST /mobile/payments/request`. */
export interface PaymentRequestResponse {
  id: string;
  /** Shareable deep link back into the app. */
  deepLink: string;
}

/** One item from `GET /mobile/payments/history`. */
export interface PaymentHistoryItem {
  id: string;
  amount: string;
  asset: string;
  status: PaymentStatus | string;
  createdAt: string;
}
