import { ethers } from 'ethers';

import type { ContractType } from './contract-types';

/**
 * Build the on-chain `depositData` blob that the deposit call expects.
 *
 * The KasuController decodes the bytes as `(bytes signature, uint256 timestamp,
 * uint256 versionType)` and uses the embedded acceptance signature to verify
 * the lender signed the loan-contract text retrospectively (via the backend
 * `/contract/resolve` cron). Ported from `kasu-ui`'s `encode-deposit-data.ts`
 * — ethers v5 instead of viem (the only dependency available on Expo).
 *
 * `versionType` packs:
 *   high byte = contract version (>= 1)
 *   low byte  = 0 for retail, 1 for exempt
 */
export function buildContractVersionType(
  contractVersion: number,
  contractType: ContractType,
): number {
  return (contractVersion << 8) + (contractType === 'retail' ? 0 : 1);
}

export function encodeDepositData(args: {
  /** EIP-191 signature from the user accepting `contractMessage`. */
  signature: string;
  /** ms-epoch from the contract response. */
  timestamp: number;
  contractVersion: number;
  contractType: ContractType;
}): string {
  const versionType = buildContractVersionType(args.contractVersion, args.contractType);
  return ethers.utils.defaultAbiCoder.encode(
    ['bytes', 'uint256', 'uint256'],
    [args.signature, ethers.BigNumber.from(args.timestamp), ethers.BigNumber.from(versionType)],
  );
}
