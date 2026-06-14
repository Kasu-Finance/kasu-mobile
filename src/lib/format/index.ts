import { ethers } from 'ethers';

/** Shorten an address to `0x1234…abcd`. */
export function shortAddress(address?: string | null, lead = 6, tail = 4): string {
  if (!address) return '';
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

/** Format a base-unit token amount (e.g. 6-decimal USDC) as a human string. */
export function formatUnits(amount: ethers.BigNumberish, decimals = 6, maxFraction = 2): string {
  try {
    const value = Number(ethers.utils.formatUnits(amount, decimals));
    return value.toLocaleString('en-US', { maximumFractionDigits: maxFraction });
  } catch {
    return '0';
  }
}

/** Parse a human token amount into base units. */
export function parseUnits(amount: string, decimals = 6): ethers.BigNumber {
  return ethers.utils.parseUnits(amount || '0', decimals);
}

/** Format a decimal APY (0.08) as a percentage string ("8.00%"). */
export function formatApy(apy: number): string {
  return `${(apy * 100).toFixed(2)}%`;
}

/**
 * Format a USD amount with a `$` prefix.
 *
 * By default, amounts ≥ 1000 show **no decimals** (e.g. `$900,825`) and smaller
 * amounts show 2 (e.g. `$12.34`). Pass `maxFraction` to override. The live
 * lifetime-yield ticker formats itself separately, so it's unaffected.
 */
export function formatUsd(amount: string | number, maxFraction?: number): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(value)) return '$0';
  const frac = maxFraction ?? (Math.abs(value) >= 1000 ? 0 : 2);
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: frac })}`;
}
