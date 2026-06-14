# kasu-mobile — implementation log & current state

A React Native (Expo SDK 56) neobank wallet. **Motto / selling point:
"Spend yield from your VISA card"** — yield earned from lending to Kasu is
auto-topped-up onto the user's VISA card. Pillars: Privy embedded wallets,
Compilot KYC, Wayex fiat on/off-ramp, **lending to Kasu pools**, P2P stablecoin
payments, push notifications, Gnosis Pay card.

## Current state (demo-ready)

- Runs on the **iOS Simulator** and as an **Android APK** (EAS builds). Both repos
  (`kasu-mobile` + `kasu-backend`) typecheck clean; `kasu-backend` `/mobile/*` is
  **deployed** (Lightsail, `backend.kasu.finance`).
- The app boots into a **read-only DEMO mode** (see below): Home shows the VISA
  card + "Weekly top up" + the real portfolio; Lend shows real strategies +
  details; Activity shows the tx feed; Profile shows identity.
- Screens are **functionally complete** but **not yet styled to the Kasu
  brand** — that's the next phase (see Planning).

### Demo mode (important)
Privy mobile login requires Apple **App Attest** / Play Integrity, which **cannot
complete on the iOS Simulator** (`invalid_native_app_id`). So:
- `EXPO_PUBLIC_DEV_LOGIN_BYPASS=true` (set in `.env` + `eas.json` for the demo/
  preview builds) makes every login button skip Privy and enter the app
  read-only. **Production builds keep real login** (flag off).
- `EXPO_PUBLIC_DEMO_PORTFOLIO_ADDRESS=0x4e96…0242` — a real Base lender (~$900k
  invested). Home/Lend read THIS address's on-chain data so the demo shows real
  numbers without a logged-in wallet. `useViewAddress()` = `connectedAddress ||
  demoPortfolioAddress`. No PII is surfaced (KYC etc. key off the connected
  address, which is null in demo).

## Architecture & non-obvious gotchas
- **Entry / polyfills** — `index.js` loads `src/lib/web3/crypto-polyfills.ts`
  before `expo-router/entry` (ethers/SDK need `getRandomValues`, Buffer, etc.).
- **Metro** — `metro.config.js` enables package exports + condition order
  `['react-native','browser','require']` so Privy's `jose` uses its WebCrypto
  build, not Node `crypto`. Required.
- **Providers at the ROOT layout** — `SdkProvider` + `NotificationsProvider` live
  in `src/app/_layout.tsx`, NOT `(tabs)/_layout`, so root routes (`/lending/[poolId]`,
  `/bank`) get the SDK (else `useSdk()` → null → "Strategy not found").
- **SDK config override** — `Kasu.create` is given
  `configOverrides: { UNUSED_LENDING_POOL_IDS: ['0x000…000'], poolMetadataMapping: {} }`.
  The subgraph treats `id_not_in: []` as "match nothing", so the SDK's default
  empty `unusedPoolIds` returns ZERO pools. The sentinel fixes it.
- **Read-only SDK** — when there's no signer (demo), `SdkProvider` builds a
  `JsonRpcProvider`-backed `Kasu` so reads work without login.
- **Base RPC** — `chains.ts` reads `EXPO_PUBLIC_BASE_RPC_URL` (a Tenderly gateway)
  with a public `mainnet.base.org` fallback. The public RPC makes `getPositions`
  take minutes; the gateway is fast. ⚠️ The gateway URL is currently also in
  committed `eas.json` — see Security follow-ups.
- **SDK amount units (gotcha)** — `tranche.investedAmount` and
  `*.yieldEarnings` are ether-formatted $ strings; **`pool.totalInvestedAmount`
  is 6-decimal BASE units** (scale ÷1e6 before display). `formatUsd` shows 0
  decimals for amounts ≥ 1000.

## Screen map
- **Home** (`app/(tabs)/index.tsx`) — flippable VISA card (tap → number/EXP/CVC);
  "Weekly top up" card (weekly $ yield + countdown to next Thu 06:00 UTC epoch);
  Add funds / Withdraw / Accounts / Send actions (bottom sheets, Wayex stubbed);
  the **portfolio** (Total invested, Avg APY, live-ticking lifetime yield,
  per-position $ amounts).
- **Lend** (`app/(tabs)/lend.tsx`) — strategies list (genesis/seed filtered out)
  → strategy details (`/lending/[poolId]`: APY, TVL, capacity, tranche breakdown,
  back button, KYC stubbed for demo).
- **Activity** — recent-activity feed; tapping a row opens a **bottom sheet** with
  tx details (real history → realistic stub fallback).
- **Profile** — "Kiril Ivanov" + GitHub avatar, wallet/KYC/network, settings, sign out.
- **Bank** (`/bank`) — stub linked account (read-only).

Backend `kasu-backend/src/mobile/` (`MobileModule`): `/mobile/kyc/{status,auth-signature}`,
`/mobile/payments/*`, `/mobile/notifications/register-push`, `/mobile/card/*`.

## How to run / build
- Local: `cp .env.example .env`, fill the Privy ids; `npx expo run:ios` (needs a
  dev client — Privy + native crypto). Typecheck: `npx tsc --noEmit`.
- EAS (authed as `kivanov82`, project `@kivanov82/kasu`): iOS Simulator =
  `eas build -p ios --profile simulator`; Android APK = `eas build -p android
  --profile preview`. Real iPhone / TestFlight needs an Apple Developer account.

## Planning — next steps
1. **Global UI styling to the Kasu brand stylesheet** (NEXT) — the structure is
   done; restyle every screen to Kasu's design system (colors, type, spacing,
   components) instead of the current minimal placeholder styling.
2. **Real login on a device** — Android APK on a real phone (Play Integrity) or
   iPhone via Apple Developer enrollment; then disable the bypass for those builds.
3. **Wire the stubs** — Wayex session/on-ramp + off-ramp (`/wayex/deposit-crypto`
   is a 501), Compilot mobile/WebView KYC flow, Gnosis Pay real endpoints + on-chain
   top-up, push event triggers.

## Security follow-ups
- ⚠️ **Tenderly Base RPC URL** is committed in `eas.json` (public repo) — restrict
  it by allowed origin in Tenderly, or move it to an EAS env var / rotate it.
- The Privy **app id + client id** in `eas.json` are public client identifiers
  (safe — they ship in the app bundle and the web app).
- `/mobile/*` controllers are `@Public()` — bind to a wallet signature before a
  real launch (esp. `kyc/status`, which returns an email).
