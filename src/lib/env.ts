/**
 * Typed access to `EXPO_PUBLIC_*` env vars (inlined by Metro at build time).
 *
 * Set these in `.env` (gitignored) or via EAS secrets. The app degrades
 * gracefully when Privy IDs are missing so a bare `expo start` still bundles.
 */
// NOTE: Metro statically replaces `process.env.EXPO_PUBLIC_*` at build time, so
// each var must be referenced explicitly (no dynamic index access).
export const env = {
  // Privy — shared with the web app so users get the same embedded wallet.
  privyAppId: process.env.EXPO_PUBLIC_PRIVY_APP_ID ?? '',
  privyClientId: process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID ?? '',

  // kasu-backend (NestJS). Existing surfaces + the new `/mobile/*` routes.
  apiBaseUrl:
    process.env.EXPO_PUBLIC_KASU_API_BASE_URL ??
    'https://allocations.api.kasu.finance',
  // Pool-delegate API key the backend's global AuthGuard expects on protected
  // routes. Public/mobile routes may not need it; sent when present.
  apiKey: process.env.EXPO_PUBLIC_KASU_API_KEY ?? '',

  // Default chain key understood by the Kasu SDK facade.
  defaultChain: (process.env.EXPO_PUBLIC_DEFAULT_CHAIN ?? 'base') as
    | 'base'
    | 'xdc'
    | 'xdc-usdc'
    | 'plume',

  // Deep-link scheme (matches app.json `scheme`).
  scheme: 'kasumobile',
} as const;
