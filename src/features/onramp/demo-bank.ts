/**
 * STUB bank details for the read-only DEMO mode. There is no live Wayex
 * session in demo, so the on/off-ramp UIs render these fixed values instead of
 * calling the backend. Replace with real `WayexDepositFiatResponse` /
 * `WayexExternalAccount` data once a session exists.
 *
 * TODO: wire Wayex — the real flow lives in `src/features/onramp/*` but needs a
 * backend session (`use-wayex-session.ts`).
 */

/** Bank details shown in the "Add money → SEPA bank transfer" expansion. */
export const DEMO_FUNDING_DETAILS = {
  iban: 'GB29 NWBK 6016 1331 9268 19',
  bic: 'NWBKGB2L',
  reference: 'KASU-DEMO-001',
} as const;

/** A single bootstrapped linked bank account shown on the "My bank" screen and
 *  pre-selected in the Withdraw sheet. */
export const DEMO_LINKED_BANK = {
  accountHolder: 'Kiril Ivanov',
  bankName: 'NatWest',
  iban: 'GB29 NWBK 6016 1331 9268 19',
  bic: 'NWBKGB2L',
} as const;

export type Currency = 'EUR' | 'USD';

export const CURRENCY_OPTIONS: ReadonlyArray<{ key: Currency; label: string }> = [
  { key: 'EUR', label: '🇪🇺 EUR' },
  { key: 'USD', label: '🇺🇸 USD' },
];
