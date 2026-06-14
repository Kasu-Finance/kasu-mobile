import { api } from '@/lib/api/client';

import { asContractType, type GenerateContractResponse } from './contract-types';

export type GenerateContractParams = {
  address: string;
  signature: string;
  timestamp: number;
  depositAmount: number;
  poolId?: string;
};

/**
 * `POST /contract/generate` → the loan contract + the `contractMessage` the
 * user signs to accept it. The backend resolves the contract type (retail vs
 * exempt) from the deposit amount and embeds the structured `formattedMessage`.
 *
 * The `x-chain-id` header is attached by the shared axios client, so — unlike
 * the web variant which threaded `chainId` through a proxy route — we don't
 * pass it in the body. Mirrors `kasu-ui`'s `fetch-generate-contract.ts`.
 */
export async function fetchGenerateContract(
  params: GenerateContractParams,
): Promise<GenerateContractResponse> {
  const res = await api.post<GenerateContractResponse>('/contract/generate', {
    address: params.address,
    signature: params.signature,
    timestamp: params.timestamp,
    depositAmount: params.depositAmount,
    poolId: params.poolId,
  });
  const data = res.data;
  // The backend types `contractType` as a free string; narrow it here so the
  // downstream encoder only ever sees 'retail' | 'exempt'.
  return { ...data, contractType: asContractType(data.contractType) };
}
