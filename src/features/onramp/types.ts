/**
 * Wire + domain types for the Wayex fiat on/off-ramp (app side).
 *
 * These mirror the kasu-backend DTOs the mobile app calls directly
 * (`kasu-backend/src/wayex/wayex.types.ts`). The mobile app talks to the
 * NestJS backend over REST — NOT to Wayex directly — so these match the
 * backend's `Wayex*Dto` / response shapes, not the raw Wayex B2B shapes.
 */

/** KYC status as surfaced by the backend (`kasu-backend/.../wayex.types.ts`).
 *  Both `under_review` and `in_review` exist; `in_review` is canonical and
 *  `under_review` is a tolerated legacy alias. */
export type WayexKycStatus =
  | 'not_started'
  | 'initiated'
  | 'pending'
  | 'in_review'
  | 'under_review'
  | 'approved'
  | 'rejected';

export type WayexTosStatus = 'not_accepted' | 'accepted';

/** `POST /wayex/session` request body. Proves wallet ownership via a signed
 *  message over `buildWayexSessionMessage(address, timestamp)`. */
export interface WayexSessionRequest {
  /** Wallet that owns the identity; lowercased server-side on persist. */
  address: string;
  /** Signature over the session message. */
  signature: string;
  /** Unix timestamp (ms) — the same value that was signed. */
  timestamp: number;
  /** Optional email captured client-side (e.g. Privy embedded wallet). */
  email?: string;
}

/** `POST /wayex/session` response. */
export interface WayexSessionResponse {
  username: string;
  token: string;
  kycStatus: WayexKycStatus;
  tosStatus: WayexTosStatus;
}

/** `GET /wayex/identity` response. */
export interface WayexIdentity {
  username: string;
  kycStatus: WayexKycStatus;
  tosStatus: WayexTosStatus;
  kycLink: string | null;
  tosLink: string | null;
  email: string | null;
  country: string | null;
}

/** `POST /wayex/verify` request body. */
export interface WayexVerifyRequest {
  /** Falls back to the stored identity email server-side when omitted. */
  email?: string;
  /** ISO 3166-1 alpha-2, e.g. "US". */
  country: string;
}

/** A registered fiat (bank) account as returned by `GET /wayex/bank-accounts`. */
export interface WayexExternalAccount {
  id: string;
  asset: string;
  networks: string[];
  nickname: string;
  name: string;
  /** Masked account number (last 4). */
  preview: string;
}

/** `GET /wayex/bank-accounts` response. */
export interface WayexBankAccountListResponse {
  externalAccounts: WayexExternalAccount[];
  success: boolean;
}

/** `POST /wayex/bank-accounts` response. */
export interface WayexBankAccountAddResponse {
  id: string;
  success: boolean;
}

/** Common + rail-specific fields for `POST /wayex/bank-accounts`. The
 *  rail-specific object (the nested `ACH` key) is forwarded verbatim. */
export type WayexAddBankAccountRequest = {
  asset: string;
  network: string;
  nickname: string;
} & Record<string, unknown>;

/** `POST /wayex/deposit-fiat` request body. `destinationAsset` /
 *  `destinationNetwork` default server-side (USDC / BASE). */
export interface WayexDepositFiatRequest {
  asset: string;
  network: string;
  destinationAddress: string;
  destinationAsset?: string;
  destinationNetwork?: string;
}

/** `POST /wayex/deposit-fiat` response — flat rail-specific bank
 *  instructions. Always carries `id` + `reference`; remaining keys vary by
 *  rail. Mirrors `WayexDepositFiatResponse` in kasu-backend. */
export type WayexDepositFiatResponse = {
  id: string;
  reference: string;
} & Record<string, string>;

/**
 * Off-ramp (withdraw-to-bank) request body. NOTE: the corresponding backend
 * route does NOT exist yet — see TODO in `off-ramp.tsx`. Shape derived from
 * `WayexDepositCryptoRequest` in kasu-backend (`/depositcrypto` client call,
 * unexposed). Kept here so the UI compiles against an intended contract.
 */
export interface WayexDepositCryptoRequest {
  /** Fiat asset to receive, e.g. "USD". */
  asset: string;
  /** Fiat rail, e.g. "ACH". */
  network: string;
  /** Registered bank account to receive the fiat. */
  externalAccountId: string;
  /** Fiat asset of the external account, e.g. "USD". */
  externalAccountAsset: string;
  /** Fiat network of the external account, e.g. "ACH". */
  externalAccountNetwork: string;
}

/** Intended off-ramp response — the deposit address the user sends crypto to. */
export interface WayexDepositCryptoResponse {
  address: string;
}

/** True once KYC is `approved` AND ToS is `accepted` — the gate every
 *  fiat-ramp action needs. */
export function isWayexReady(identity: Pick<
  WayexIdentity,
  'kycStatus' | 'tosStatus'
> | undefined): boolean {
  return (
    identity?.kycStatus === 'approved' && identity?.tosStatus === 'accepted'
  );
}

/** KYC statuses where verification is in-flight (don't re-prompt). */
export const WAYEX_PENDING_KYC_STATUSES: ReadonlySet<WayexKycStatus> = new Set([
  'initiated',
  'pending',
  'in_review',
  'under_review',
]);
