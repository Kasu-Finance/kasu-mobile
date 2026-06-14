import type { PropsWithChildren, ReactNode } from 'react';

export interface DemoKycGateProps {
  /** Accepted for API parity with the real `KycGate`; ignored in demo. */
  address?: string | null;
  prompt?: string;
  fallback?: ReactNode;
}

/**
 * DEMO stub for `@/features/kyc`'s `KycGate`.
 *
 * The real gate blocks the deposit/withdraw flow behind a verified Nexera KYC
 * status and pushes the `/kyc` route when the user isn't verified. For the
 * read-only demo build there is no signer to satisfy that flow, so this stub
 * treats KYC as already verified and renders its children unchanged — letting
 * the deposit/withdraw flow proceed to its review/confirmation step.
 *
 * Swap this back for the real `KycGate` when wiring up a live signer.
 */
export function DemoKycGate({ children }: PropsWithChildren<DemoKycGateProps>) {
  return <>{children}</>;
}
