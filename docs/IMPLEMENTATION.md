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
- Screens are **functionally complete** and **styled to the Kasu brand**
  (dark-only, brass `#d29e61`, DM Sans + Crimson Text serif headings, gold-bonsai
  VISA card). See "Branding" below.

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

## Branding (Kasu brand pass)

The app is restyled to the web design system (`kasu-ui/src/app/globals.css`).
**JS-only** — no native rebuild (fonts load at runtime via `expo-font`;
`react-native-svg` + `expo-image` were already linked).

- **Dark-only.** `useTheme()` always returns the brand palette; the root layout
  forces `DarkTheme` + `userInterfaceStyle: "dark"` + `StatusBar light`.
- **Tokens** live in `src/constants/theme.ts` (`Colors` — bg `#1f1f24`, card
  `#2b2b30`, brass `primary #d29e61`, `onAccent #241a0c`, `success #84a45f`,
  `destructive #e4645a`, …) plus `Radius`. The legacy accent `#c4996c` →
  `#d29e61`; `ACCENT` in `theme-extras.ts` now equals the brass primary. All
  previously-hardcoded hexes were mapped to brand values.
- **Fonts** bundled via `@expo-google-fonts/{dm-sans,crimson-text}` and gated in
  `_layout.tsx`. **Crimson Text** (serif) carries headings — `ThemedText`
  `title`/`subtitle` are serif, so every screen heading + big number inherits it
  automatically; **DM Sans** carries body/UI.
- **Mark** — `src/components/ui/kasu-mark.tsx` renders the chevron via
  react-native-svg (path inlined; no svg-transformer configured). `Brand` =
  mark + serif "Kasu".
- **VISA card** (`visa-card.tsx`) — front: mark + serif wordmark on brand-dark,
  brass detailing; **back: full-bleed gold bonsai** (`assets/brand/bonsai.png`,
  downscaled to 871×1000) under a dark scrim, with PAN/EXP/CVC overlaid. Flip
  animation unchanged.
- **Buttons** are brass pills; **NativeTabs** tinted brass on a dark bar.

## UI refinements (since the branding pass)

All JS-only; shipped on `master` (latest `c74859d`, pushed to origin).

- **Add money sheet** (`features/onramp/add-money-sheet.tsx`) — reworked to a single
  **EUR / USD / USDC** selector (no more SEPA/Debit-card rows). EUR/USD show the
  bank-transfer IBAN/BIC/Reference directly; **USDC** is the on-chain Base address
  + copy button (NOT a Wayex rail). `Segmented` now supports a leading `icon`
  (`SegmentedOption.icon`); USDC uses `src/components/ui/usdc-mark.tsx`
  (react-native-svg token logo) so it aligns with the EUR/USD flags.
- **Glass** — the shared bottom sheet (`features/onramp/sheet.tsx`, used by Add
  money / Withdraw / Send **and** the Activity transaction-detail dialog) renders
  `expo-glass-effect` `GlassView` on iOS 26+ (`glassEffectStyle="regular"`,
  `tintColor` `rgba(31,31,36,0.45)`); solid `theme.background` fallback elsewhere
  (gated by `isLiquidGlassAvailable()`).
- **Lend strategy cards** (`features/lending/strategies-list.tsx`) — restyled to the
  web `strategy-card`: serif title, asset-class line, an **elevated Net APY panel**
  (`cardElevated` bg + border, big brass serif figure), green **⚡ Live** /
  terracotta **Full** status pill, and divided TVL / capacity rows.
- **Splash** — branded: white Kasu logo on `#1f1f24` (`assets/brand/splash-logo.png`,
  wired in `app.json`'s `expo-splash-screen`). NOTE: keep it a single (non-`dark`)
  variant — a `dark` block conflicts with the forced `userInterfaceStyle: "dark"`.
- **Removed demo disclaimer copy** — "Demo only…" / "Withdrawals are disabled…" /
  "Demo account — read only…" / "Sending is disabled…".
- **Safe-area fix** — `Screen` gained an `edges` prop (default `['top']`). The
  Activity tab pins its segmented switcher above the scroll body, so the switcher
  carries the top inset (`insets.top + 12`) and the body `Screen edges={[]}` opts
  out — fixes the brass segment that used to render under the status bar.

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
- Typecheck: `npx tsc --noEmit`. Lint: `npx expo lint` (note: a couple of
  pre-existing `set-state-in-effect` / `array-type` items are unrelated noise).
- ⚠️ **`expo run:ios` (local dev client) does NOT work on this Mac** — CocoaPods is
  broken (npm `pod` squatter + brew cocoapods missing `ffi` under Ruby 4.0). Use
  EAS instead. Fixing it (then hot-reload works) is noted in the auto-memory.
- EAS (authed as `kivanov82`, project `@kivanov82/kasu`): iOS Simulator =
  `eas build -p ios --profile simulator --non-interactive`; Android APK =
  `eas build -p android --profile preview --non-interactive`. **Install the latest
  sim build:** `eas build:run -p ios --latest` (then it boots into the demo).
  Real iPhone / TestFlight needs an Apple Developer account.
- **Reminder:** UI changes are JS-only but the installed sim build is a *release*
  build (no Metro) — to SEE a change you must rebuild + `build:run` again, OR fix
  the local dev client. Don't assume a push is visible on the sim.

## Planning — next steps
1. ~~**Global UI styling to the Kasu brand stylesheet**~~ ✅ **DONE** — see
   "Branding" above (dark-only, brass + serif, gold-bonsai VISA card).
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
