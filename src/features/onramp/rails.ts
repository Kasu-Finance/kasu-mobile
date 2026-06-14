/**
 * Fiat rail definitions for registering bank accounts. v1 ships USD/ACH only,
 * mirroring `kasu-ui/.../register-bank-account-dialog-impl.tsx` (the
 * structure stays pluggable — adding EUR/SEPA is a new entry, not a fork).
 *
 * `buildDetails` produces the exact rail-specific object the backend forwards
 * verbatim to Wayex `POST /fiataccount` (`type:"add"`).
 */

export type RailKey = 'USD_ACH';

export interface RailFieldDef {
  name: string;
  label: string;
  placeholder: string;
  /** Renders a chooser instead of a text input. */
  options?: ReadonlyArray<{ value: string; label: string }>;
  /** Hints the numeric keyboard. */
  numeric?: boolean;
  /** Returns an error message, or null when valid. Runs after the
   *  required-field check, so `value` is always non-empty. */
  validate?: (value: string) => string | null;
}

export interface RailDef {
  key: RailKey;
  /** Pretty label for the rail chooser. */
  label: string;
  /** Wayex `asset` value sent to the API. */
  asset: string;
  /** Wayex `network` value sent to the API. */
  network: string;
  fields: ReadonlyArray<RailFieldDef>;
  /** Builds the rail-specific account object Wayex expects. */
  buildDetails: (values: Record<string, string>) => Record<string, unknown>;
}

export const RAILS: readonly RailDef[] = [
  {
    key: 'USD_ACH',
    label: 'USD — United States (ACH)',
    asset: 'USD',
    network: 'ACH',
    fields: [
      {
        name: 'accountOwnerName',
        label: 'Account Holder Name',
        placeholder: 'Full Legal Name',
      },
      { name: 'bankName', label: 'Bank Name', placeholder: 'Chase Bank' },
      {
        name: 'routingNumber',
        label: 'Routing Number',
        placeholder: '021000021',
        numeric: true,
        validate: (v) =>
          /^\d{9}$/.test(v) ? null : 'Routing numbers are 9 digits.',
      },
      {
        name: 'accountNumber',
        label: 'Account Number',
        placeholder: '1234567890',
        numeric: true,
        validate: (v) =>
          /^\d{4,17}$/.test(v)
            ? null
            : 'Enter the account number (digits only).',
      },
      {
        name: 'checkingOrSavings',
        label: 'Account Type',
        placeholder: '',
        options: [
          { value: 'checking', label: 'Checking' },
          { value: 'savings', label: 'Savings' },
        ],
      },
      {
        name: 'streetLine1',
        label: 'Street Address',
        placeholder: '123 Main St',
      },
      { name: 'city', label: 'City', placeholder: 'New York' },
      { name: 'state', label: 'State', placeholder: 'NY' },
      {
        name: 'postalCode',
        label: 'ZIP Code',
        placeholder: '10001',
        numeric: true,
        validate: (v) =>
          /^\d{5}(-\d{4})?$/.test(v) ? null : 'Enter a valid US ZIP code.',
      },
    ],
    buildDetails: (v) => ({
      ACH: {
        currency: 'usd',
        bank_name: v.bankName,
        account_owner_name: v.accountOwnerName,
        account_type: 'us',
        account: {
          account_number: v.accountNumber,
          routing_number: v.routingNumber,
          checking_or_savings: v.checkingOrSavings,
        },
        address: {
          street_line_1: v.streetLine1,
          city: v.city,
          state: v.state,
          country: 'US',
          postal_code: v.postalCode,
        },
      },
    }),
  },
] as const;

export const DEFAULT_RAIL: RailKey = 'USD_ACH';
