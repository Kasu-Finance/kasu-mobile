import { usePrivy } from '@privy-io/expo';

import { useKycStatus } from '@/features/kyc/use-kyc-status';
import { useViewAddress } from '@/lib/web3/use-view-address';

export interface Identity {
  /** Display name: KYC legal name → email local-part → "Kasu member". */
  name: string;
  /** Single avatar letter. */
  initial: string;
  /** Login email (may be empty). */
  email: string;
  address: string | null;
  /** "June 2026" once we know when the account was created, else null. */
  memberSince: string | null;
  isVerified: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Format an account-creation timestamp as "June 2026". Privy's `created_at`
 * comes through as a Unix value in **seconds** (so `new Date(secs)` reads it as
 * ms → 1970); normalise seconds→ms, accept ISO strings / Date too, and guard
 * bogus pre-2000 values (return null so "Since …" simply hides).
 */
function monthYear(value: unknown): string | null {
  if (value == null) return null;
  let ms: number | null = null;
  if (value instanceof Date) ms = value.getTime();
  else if (typeof value === 'number') ms = value < 1e12 ? value * 1000 : value;
  else if (typeof value === 'string') {
    if (/^\d+$/.test(value)) {
      const n = Number(value);
      ms = n < 1e12 ? n * 1000 : n;
    } else {
      ms = Date.parse(value);
    }
  }
  if (ms == null || Number.isNaN(ms)) return null;
  const d = new Date(ms);
  if (d.getFullYear() < 2000) return null;
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Avatar letter. Prefers the KYC legal name, then the email; falls back to the
 * wallet address skipping the `0x` prefix (every EOA starts with '0', so
 * charAt(0) would be '0' for everyone), else 'K'. Mirrors kasu-ui's
 * `avatarInitial`, with the KYC name added on top.
 */
function avatarInitial(fullName: string, email: string, address: string | null): string {
  if (fullName) return fullName.charAt(0).toUpperCase();
  if (email) return email.charAt(0).toUpperCase();
  if (address && address.startsWith('0x') && address.length > 2) {
    return address.charAt(2).toUpperCase();
  }
  return address?.charAt(0).toUpperCase() ?? 'K';
}

/**
 * The logged-in user's identity for the profile + Home avatar. Real name comes
 * from KYC once passed (`fullName`); before that we show the email (or wallet)
 * so there's always a sensible letter/label. Chain/wallet stay invisible.
 */
export function useIdentity(): Identity {
  const { user } = usePrivy();
  const { viewAddress } = useViewAddress();
  const kyc = useKycStatus(viewAddress);

  const linked = user?.linked_accounts ?? [];
  const emailAccount = linked.find(
    (a) => a.type === 'email' || a.type === 'google_oauth',
  ) as { address?: string; email?: string } | undefined;
  const email =
    emailAccount?.address ?? emailAccount?.email ?? kyc.email ?? '';

  const fullName = (kyc.fullName ?? '').trim();
  const name = fullName || (email ? email.split('@')[0] : 'Kasu member');
  const initial = avatarInitial(fullName, email, viewAddress);
  const memberSince = monthYear(
    (user as { created_at?: unknown } | null)?.created_at,
  );

  return {
    name,
    initial,
    email,
    address: viewAddress,
    memberSince,
    isVerified: kyc.isVerified,
  };
}
