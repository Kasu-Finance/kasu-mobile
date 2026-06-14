import type { UserRequest, UserRequestEvent } from '@kasufinance/kasu-sdk';

import { formatUsd } from '@/lib/format';

/** Visual category for an activity row — drives glyph + dot colour. */
export type ActivityKind = 'deposit' | 'yield' | 'withdrawal' | 'cancellation';

/** A single labelled fact shown in the expanded detail of a row. */
export interface ActivityDetail {
  label: string;
  value: string;
}

/** A normalised, presentation-ready activity feed row. */
export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  /** Bold row title, e.g. "Deposit" or "Yield credited". */
  title: string;
  /** Secondary line: strategy / pool name. */
  subtitle: string;
  /** Unix epoch (seconds). */
  timestamp: number;
  /** Signed, formatted amount string, e.g. "+$50,000" or "-$10,000". */
  amount: string;
  /** Whether the amount represents an inflow (green) vs outflow (neutral). */
  positive: boolean;
  /** Human status label, e.g. "Processed", "Requested". */
  status: string;
  /** Extra facts revealed when the row is expanded (status, pool, tranche,
   *  full amount, epoch/date, reference). */
  details: ActivityDetail[];
}

/**
 * `UserRequest` amount fields (`requestedAmount`, `acceptedAmount`, …) and the
 * event `assetAmount` fields are **ether-formatted, whole-unit decimal
 * strings** — e.g. a 50,000 USDC deposit arrives as `"50000"`, not the
 * 6-decimal base-unit `"50000000000"`. This matches how kasu-ui reads them
 * (`Number(str)` with no `formatUnits` division, see
 * `kasu-ui/src/features/portfolio/lib/derive-transaction-view.ts`).
 *
 * The previous code ran these through `formatUnits(amount, 6)`, dividing by
 * 1e6 and turning a $50,000 deposit into "+$0.05". We therefore parse the
 * string as a plain number and format it directly with `formatUsd`.
 */
function toNumber(amount: string | undefined): number {
  const n = Number(amount ?? '0');
  return Number.isFinite(n) ? n : 0;
}

/** Format a whole-unit USDC amount with a leading sign and `$`. */
function signedUsd(wholeUnits: string | number, positive: boolean): string {
  const value = Math.abs(typeof wholeUnits === 'string' ? toNumber(wholeUnits) : wholeUnits);
  return `${positive ? '+' : '-'}${formatUsd(value)}`;
}

/** Unix-seconds → "Jun 12, 2024" (empty string when not a valid date). */
function formatDetailDate(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const findEvent = (events: UserRequestEvent[], type: UserRequestEvent['requestType']) =>
  events.find((e) => e.requestType === type);

/**
 * Cancelled requests have their `requestedAmount` zeroed on the request
 * itself; the original survives on the `Initiated` event's `assetAmount`.
 * Mirrors kasu-ui's `initiatedAmount` recovery so cancelled rows still show a
 * real number.
 */
function originalRequested(req: UserRequest): number {
  const requested = toNumber(req.requestedAmount);
  if (requested > 0) return requested;
  const initiated = findEvent(req.events ?? [], 'Initiated');
  return initiated ? toNumber(initiated.assetAmount) : 0;
}

/** Build the expanded detail rows for a single request. */
function toDetails(req: UserRequest): ActivityDetail[] {
  const events = req.events ?? [];
  const requested = originalRequested(req);
  const accepted = toNumber(req.acceptedAmount);
  const rejected = toNumber(req.rejectedAmount);

  // The most informative epoch is the one the request settled in (its
  // Accepted event); fall back to the latest event with an epoch id.
  const acceptedEvent = findEvent(events, 'Accepted');
  const epochId =
    acceptedEvent?.epochId ??
    [...events].reverse().find((e) => e.epochId)?.epochId ??
    '';

  const settledTimestamp = acceptedEvent?.timestamp ?? 0;

  const details: ActivityDetail[] = [
    { label: 'Status', value: req.status },
    { label: 'Pool', value: req.lendingPool?.name ?? 'Lending pool' },
    { label: 'Tranche', value: req.trancheName || '—' },
    { label: 'Requested', value: formatUsd(requested) },
  ];

  if (accepted > 0) {
    details.push({ label: 'Accepted', value: formatUsd(accepted) });
  }
  if (req.requestType === 'Deposit' && rejected > 0) {
    details.push({ label: 'Returned', value: formatUsd(rejected) });
  }
  if (req.apy && req.apy !== '0') {
    details.push({ label: 'APY', value: req.apy });
  }
  if (epochId) {
    details.push({ label: 'Epoch', value: epochId });
  }
  if (settledTimestamp) {
    const date = formatDetailDate(settledTimestamp);
    if (date) details.push({ label: 'Settled', value: date });
  }
  details.push({ label: 'Reference', value: req.id });

  return details;
}

/**
 * Map raw SDK `UserRequest[]` into display rows, newest first.
 *
 * Deposits are treated as inflows (+), withdrawals as outflows (-). The accepted
 * amount is preferred once known; otherwise the requested amount is shown.
 */
export function toActivityItems(requests: UserRequest[]): ActivityItem[] {
  return [...requests]
    .sort((a, b) => b.timestamp - a.timestamp)
    .map((req): ActivityItem => {
      const isDeposit = req.requestType === 'Deposit';
      const cancelled = (req.events ?? []).some((e) => e.requestType === 'Cancelled');
      const acceptedNum = toNumber(req.acceptedAmount);
      // Prefer the accepted amount once settled; otherwise the (original)
      // requested amount — recovered from the Initiated event when cancelled.
      const displayAmount = acceptedNum > 0 ? acceptedNum : originalRequested(req);

      const kind: ActivityKind = cancelled
        ? 'cancellation'
        : isDeposit
          ? 'deposit'
          : 'withdrawal';

      const title = cancelled
        ? isDeposit
          ? 'Deposit cancelled'
          : 'Withdrawal cancelled'
        : isDeposit
          ? 'Deposit'
          : 'Withdrawal request';

      return {
        id: req.id,
        kind,
        title,
        subtitle: req.lendingPool?.name ?? req.trancheName ?? 'Lending pool',
        timestamp: req.timestamp,
        amount: signedUsd(displayAmount, isDeposit),
        positive: isDeposit && !cancelled,
        status: req.status,
        details: toDetails(req),
      };
    });
}

/**
 * A realistic fallback feed used in DEMO mode (or whenever on-chain history is
 * empty/unavailable) so the Activity tab never renders blank. Timestamps are
 * relative to "now" so the dates always look fresh.
 */
export function stubActivityItems(now = Date.now()): ActivityItem[] {
  const day = 86_400; // seconds
  const t = Math.floor(now / 1000);
  const settled = (epochSeconds: number) =>
    new Date(epochSeconds * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  return [
    {
      id: 'stub-1',
      kind: 'deposit',
      title: 'Deposit',
      subtitle: 'Whole Ledger Funding',
      timestamp: t - 2 * day,
      amount: '+$50,000',
      positive: true,
      status: 'Processed',
      details: [
        { label: 'Status', value: 'Processed' },
        { label: 'Pool', value: 'Whole Ledger Funding' },
        { label: 'Tranche', value: 'Senior' },
        { label: 'Requested', value: '$50,000' },
        { label: 'Accepted', value: '$50,000' },
        { label: 'APY', value: '12.50%' },
        { label: 'Epoch', value: '184' },
        { label: 'Settled', value: settled(t - 2 * day) },
        { label: 'Reference', value: 'stub-1' },
      ],
    },
    {
      id: 'stub-2',
      kind: 'yield',
      title: 'Yield credited',
      subtitle: 'Whole Ledger Funding · Senior',
      timestamp: t - 4 * day,
      amount: '+$2,560',
      positive: true,
      status: 'Processed',
      details: [
        { label: 'Status', value: 'Processed' },
        { label: 'Pool', value: 'Whole Ledger Funding' },
        { label: 'Tranche', value: 'Senior' },
        { label: 'Yield', value: '$2,560' },
        { label: 'Epoch', value: '184' },
        { label: 'Credited', value: settled(t - 4 * day) },
        { label: 'Reference', value: 'stub-2' },
      ],
    },
    {
      id: 'stub-3',
      kind: 'withdrawal',
      title: 'Withdrawal request',
      subtitle: 'SME Trade Finance · Junior',
      timestamp: t - 9 * day,
      amount: '-$10,000',
      positive: false,
      status: 'Processing',
      details: [
        { label: 'Status', value: 'Processing' },
        { label: 'Pool', value: 'SME Trade Finance' },
        { label: 'Tranche', value: 'Junior' },
        { label: 'Requested', value: '$10,000' },
        { label: 'Epoch', value: '183' },
        { label: 'Reference', value: 'stub-3' },
      ],
    },
    {
      id: 'stub-4',
      kind: 'deposit',
      title: 'Deposit',
      subtitle: 'SME Trade Finance',
      timestamp: t - 16 * day,
      amount: '+$25,000',
      positive: true,
      status: 'Processed',
      details: [
        { label: 'Status', value: 'Processed' },
        { label: 'Pool', value: 'SME Trade Finance' },
        { label: 'Tranche', value: 'Senior' },
        { label: 'Requested', value: '$25,000' },
        { label: 'Accepted', value: '$25,000' },
        { label: 'APY', value: '14.00%' },
        { label: 'Epoch', value: '181' },
        { label: 'Settled', value: settled(t - 16 * day) },
        { label: 'Reference', value: 'stub-4' },
      ],
    },
    {
      id: 'stub-5',
      kind: 'yield',
      title: 'Yield credited',
      subtitle: 'SME Trade Finance · Senior',
      timestamp: t - 18 * day,
      amount: '+$1,180',
      positive: true,
      status: 'Processed',
      details: [
        { label: 'Status', value: 'Processed' },
        { label: 'Pool', value: 'SME Trade Finance' },
        { label: 'Tranche', value: 'Senior' },
        { label: 'Yield', value: '$1,180' },
        { label: 'Epoch', value: '180' },
        { label: 'Credited', value: settled(t - 18 * day) },
        { label: 'Reference', value: 'stub-5' },
      ],
    },
    {
      id: 'stub-6',
      kind: 'cancellation',
      title: 'Withdrawal cancelled',
      subtitle: 'Whole Ledger Funding · Junior',
      timestamp: t - 27 * day,
      amount: '-$5,000',
      positive: false,
      status: 'Processed',
      details: [
        { label: 'Status', value: 'Cancelled' },
        { label: 'Pool', value: 'Whole Ledger Funding' },
        { label: 'Tranche', value: 'Junior' },
        { label: 'Requested', value: '$5,000' },
        { label: 'Epoch', value: '178' },
        { label: 'Reference', value: 'stub-6' },
      ],
    },
  ];
}
