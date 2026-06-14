/**
 * Shape of the loan-contract payload returned by kasu-backend
 * `POST /contract/generate` (and `/contract/resolve`). Ported from
 * `kasu-ui/src/features/lending/lib/contract-types.ts`.
 *
 * The backend `ContractContentDto` carries:
 *   - `contractMessage`  — the plaintext the user signs (EIP-191)
 *   - `formattedMessage` — JSON-encoded structured tree for rendering
 *   - `contractType`     — 'retail' | 'exempt' (drives the version byte)
 *   - `contractVersion`  — template version (>= 1)
 *   - `timestamp`        — ms-epoch; feeds the on-chain depositData + TTL guard
 */

export type ContractListItem = {
  label?: string;
  description?: string;
} & {
  [k: string]: unknown;
};

export type ContractSection = {
  title?: string;
  description?: string;
} & {
  [k: `list-${number}`]: ContractListItem | undefined;
} & {
  [k: string]: unknown;
};

export type RetailLoanContract = {
  important?: { title?: string; description?: string };
  intro?: string;
  between?: string;
  parties?: ContractSection;
  background?: ContractSection;
  witnesses?: ContractSection;
} & {
  [k: `subheader-${number}`]: ContractSection | undefined;
} & {
  [k: string]: unknown;
};

export type ExemptLoanContract = RetailLoanContract;

export type LoanContractFormatted = RetailLoanContract | ExemptLoanContract;

/** `contractType` over the wire is a free string; narrow to the two we encode. */
export type ContractType = 'retail' | 'exempt';

export type GenerateContractResponse = {
  fullName: string;
  contractMessage: string;
  /** Server returns this as a JSON-encoded string; parse before rendering. */
  formattedMessage: string;
  contractType: ContractType;
  contractVersion: number;
  timestamp: number;
};

/** Normalise the backend's loose `contractType` string to our union. */
export function asContractType(raw: string): ContractType {
  return raw === 'exempt' ? 'exempt' : 'retail';
}

/** Parse the server's JSON-string `formattedMessage` into a tree. Returns
 * `null` on parse failure so the renderer can fall back to plaintext. */
export function parseFormattedMessage(raw: string): LoanContractFormatted | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') return parsed as LoanContractFormatted;
    return null;
  } catch {
    return null;
  }
}
