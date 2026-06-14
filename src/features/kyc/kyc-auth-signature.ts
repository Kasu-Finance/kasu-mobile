import type { KycParams } from '@kasufinance/kasu-sdk';

import { api } from '@/lib/api/client';

/**
 * Request body for `POST /mobile/kyc/auth-signature`. This is exactly the
 * `KycParams` object the Kasu SDK produces via
 * `kasu.deposits.buildKycParams(address)` — the lending feature (F2) builds it
 * and passes it straight here. `contractAbi` is optional over the wire; the
 * backend can resolve the ABI server-side when omitted.
 */
export interface KycAuthSignatureParams {
  contractAddress: string;
  functionName: string;
  args: KycParams['args'];
  userAddress: string;
  chainId: string;
  contractAbi?: unknown;
}

/**
 * Compilot/Nexera-issued authorization signature the on-chain deposit call must
 * include to prove the caller passed KYC. `blockExpiration` is the block at
 * which the signature stops being valid — callers should submit promptly.
 */
export interface KycAuthSignatureResult {
  signature: string;
  blockExpiration: number;
}

/**
 * Fetches the KYC auth signature from kasu-backend. The lending feature reuses
 * this together with `kasu.deposits.buildKycParams(address)`:
 *
 * ```ts
 * const params = kasu.deposits.buildKycParams(address);
 * const { signature, blockExpiration } = await fetchKycAuthSignature(params);
 * // → feed into the deposit tx
 * ```
 *
 * Unlike `useKycStatus`, this intentionally does NOT swallow errors: a deposit
 * must not proceed without a valid signature, so the caller handles failure
 * (e.g. surface a retry).
 */
export async function fetchKycAuthSignature(
  params: KycAuthSignatureParams,
): Promise<KycAuthSignatureResult> {
  const res = await api.post<KycAuthSignatureResult>('/mobile/kyc/auth-signature', params);
  return res.data;
}
