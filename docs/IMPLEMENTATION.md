# kasu-mobile — implementation log & current state

A React Native (Expo SDK 56) **neobank**. **Motto: "Spend yield from your VISA
card."** Money you hold earns yield by lending to Kasu, and that yield tops up a
Mastercard you spend anywhere.

**Product thesis (the rule everything follows): copy Plasma One's UX 1:1, with
ZERO crypto vocabulary.** No "USDC / wallet / crypto / DeFi / on-chain / token"
anywhere in the UI — dollars, Balance, Account, Card. The target user is a
non-crypto "neobank" customer; the embedded wallet and chain are invisible
plumbing. Goal: a **fully operational app, everything real, except Mastercard
spending** (Immersve sandbox — which must still *look* real).

> Full roadmap + vendor research + decisions live in the workspace-root doc
> **`docs/mobile-neobank-concept-plan.md`** (one level up from this repo). This
> file is the implementation log; that file is the plan.

## Current state (2026-07-05)

- **Runs as a dev client on a real iPhone** (EAS `development` profile) with
  **Metro hot reload** (`npx expo start`) — JS changes appear in ~1s, no rebuild.
  Also runs on the iOS Simulator (`simulator` profile).
- **Real login** — email OTP / Google / Apple via Privy embedded wallets. **No
  demo mode** (removed 2026-07-02: no login bypass, no demo portfolio address).
- **Backend is live in prod** — `kasu-backend` on Lightsail (`backend.kasu.finance`),
  the whole `/mobile/*` surface enabled (`MOBILE_ENABLED=true`) with the Immersve
  card module against the Immersve public sandbox.
- **Card works end-to-end** on the Immersve sandbox: silent wallet session →
  in-app identity check → create + activate → real PAN on the flippable card →
  funded balance + seeded purchases in the feed.
- Dark-only, branded (brass `#d29e61`, DM Sans + Crimson Text serif, gold-bonsai
  card, brass app icon).

### What's real vs stubbed
| Area | State |
|---|---|
| Login (email/Google/Apple), embedded wallet | ✅ real |
| Lending strategies, APY, portfolio | ✅ real (on-chain via SDK) |
| Card: onboarding, KYC, PAN reveal, top-up, purchases | ✅ real on the **Immersve sandbox** (looks real; testnet behind it) |
| Activity feed (lending + card purchases merged) | ✅ real |
| Fiat "Add funds" (bank transfer / debit card) | 🔶 stubbed "Soon" — MoonPay/Bridge, plan Phase D |
| Lending KYC (Compilot) on mobile | 🔶 deferred — unbuilt gap (see below); shows "coming shortly" |
| Withdraw / off-ramp | 🔶 not wired (Phase D) |
| Payments / notifications endpoints | ⚠️ enabled but DB tables may be unprovisioned; card path unaffected |

## IA / screen map
Tabs (NativeTabs): **Home / Earn / Rewards**. Activity and Profile are **pushed
routes** (`/activity`, `/profile`), not tabs.

- **Home** (`app/(tabs)/index.tsx`) — the **card is the hero**. Tapping it flips
  the card (revealing the real number, with a "Loading your details…" state
  while the PAN fetches) and swaps the content below for **card management**
  (card balance, top up, card activity, sample purchase). Flipping back returns
  to the account view: two Plasma-style actions (**Add funds** / **Send**), the
  weekly-interest hook (`EpochYield`), the portfolio summary, and the merged
  activity feed. Single balance, shown on the card. **Pull down to refresh.**
- **Earn** (`app/(tabs)/earn.tsx` → `lending-screen`) — `EarnHeader` (best live
  APY headline + "$X could earn you $Y/yr" simulator + weekly-Thursday framing)
  over the strategies list → strategy detail (`/lending/[poolId]`) → the stepped
  deposit flow (`use-deposit.ts`: contract → sign → exact-amount approve →
  deposit → receipt). Deposits are gated by the real Compilot `KycGate`.
- **Rewards** (`app/(tabs)/rewards.tsx`) — cashback + referral shape (zeros until
  the card program feeds it), Thursday framing.
- **Activity** (`app/activity.tsx`) — merged feed (lending + card `spend`) with a
  segmented Activity / Payments / Alerts switcher; tap a row for a detail sheet.
- **Profile** (`app/profile.tsx`) — Privy identity, account/KYC, settings, sign out.
- **Onboarding** (`app/(auth)/`) — `welcome` (card hero + motto) → `features`
  (3-slide carousel) → `login` (Apple first, then Google, then email). Logged-out
  entry redirects to `/(auth)/welcome`.

## Card integration (Immersve) — the centerpiece
Replaced the earlier Gnosis Pay stub. Non-custodial: the user's Privy embedded
**EOA** funds a Mastercard on the Immersve rail. (Smart-account/Safe signatures
are rejected by Immersve — verified — so it's a plain EOA; see plan §3.1.)

App (`src/features/card/`):
- `use-card-session.ts` — **silent SIWE**: the embedded wallet signs Immersve's
  challenge programmatically the moment it's ready, so the user never sees a
  "connect/sign wallet" step.
- `use-card-status.ts` — the state machine: `session-required → kyc-required →
  kyc-pending → ready → active` (+ `frozen`/`rejected`). Polls while settling.
- `card-screen.tsx` — onboarding sub-flow (bank-style copy: "Verify your
  identity" with a phone field + the account email, framed as a card-partner
  check). Create navigates back to Home.
- **In-app KYC** — `app/card-kyc.tsx` hosts the hosted check in a full-screen
  `react-native-webview` (camera via `NSCameraUsageDescription`), our own header,
  no browser chrome. Refetches card status on close / app-foreground.
- `card-management.tsx` — the flipped-card panel on Home (balance, top up, card
  activity, sample purchase).
- `use-card-pan.ts` — reveals the real PAN via a single-use secure token,
  fetched **by the app** (card numbers never transit our backend, PCI).
- `use-card-demo.ts` — sandbox demo: funds the card ($500 simulator deposit) then
  seeds a few realistic purchases (a $0 card can't authorize, so funding is
  required first); guarded to the sandbox by the backend.

Backend (`kasu-backend/src/mobile/card/`):
- `immersve.client.ts` (typed REST wrapper) + `immersve-session.store.ts`
  (in-memory per-wallet sessions; single-use refresh tokens) + `mobile-card.service.ts`.
- Endpoints: `POST session/init`, `POST session/complete`, `GET status`,
  `POST contact`, `POST create`, `POST pan-token`, `POST topup`,
  `GET transactions`, `POST demo/simulate-purchase` (sandbox-only, guarded).
- Config via `IMMERSVE_*` env (base URL, client app id, card program id, funding
  channel = simulator, network = polygon-amoy, api key/secret). Unconfigured →
  status `none` (degrades gracefully).

## Backend deploy notes
- `kasu-backend` deploys via `./deploy.sh` (build linux/amd64 → push → **read the
  live env back and re-apply with the new image**; never wipes the env map).
- The `/mobile/*` module is gated by **`MOBILE_ENABLED=true`** in the Lightsail
  env — it was dormant until 2026-07-03. Env-only changes (adding `IMMERSVE_*`,
  `MOBILE_ENABLED`) use the guarded read-merge-write pattern in `deploy.sh`.
- Current prod: image `v33`, env has 74 keys incl. all `IMMERSVE_*` + `MOBILE_ENABLED`.

## Architecture & non-obvious gotchas
- **Entry / polyfills** — `index.js` loads `src/lib/web3/crypto-polyfills.ts`
  before `expo-router/entry` (ethers/SDK need `getRandomValues`, Buffer, etc.).
- **Metro** — `metro.config.js` sets package-exports condition order
  `['react-native','browser','require']` so Privy's `jose` uses its WebCrypto
  build, not Node `crypto`. Required.
- **Providers at the ROOT layout** — `SdkProvider` + `NotificationsProvider` in
  `src/app/_layout.tsx` (not `(tabs)/_layout`) so root routes get the SDK.
- **SDK config override** — `Kasu.create` gets
  `configOverrides: { UNUSED_LENDING_POOL_IDS: ['0x000…000'], poolMetadataMapping: {} }`.
  The subgraph treats `id_not_in: []` as "match nothing", so the default empty
  list returns ZERO pools; the sentinel fixes it.
- **Read-only SDK** — before a signer exists, `SdkProvider` builds a
  `JsonRpcProvider`-backed `Kasu` so strategy/pool reads work pre-login.
- **Base RPC** — `chains.ts` reads `EXPO_PUBLIC_BASE_RPC_URL` (Tenderly gateway)
  with a `mainnet.base.org` fallback; the public RPC is slow for `getPositions`.
- **SDK amount units** — `tranche.investedAmount` / `*.yieldEarnings` are
  ether-formatted $ strings; **`pool.totalInvestedAmount` is 6-decimal base
  units** (÷1e6 before display). Card balances are 6-decimal minor units too.
- **Single balance (the two-pocket reality)** — the wallet balance and the card
  funding balance are different pockets on Base (deposit-based funding). Home
  shows the card's spendable balance on the card face once a card is active; the
  long-term "one balance" story needs approval-based funding on Base (plan §3.4).

## Build / run
- **Dev loop:** `npx expo start`, open the dev client on the iPhone, hot reload.
  This is the default now — the device dev client was built once (EAS
  `development` profile) and only needs a rebuild for **native** changes.
- **Native changes that force an EAS rebuild** (and a reinstall): new native
  modules, iOS entitlements/Info.plist (camera, Sign in with Apple), the app
  icon. Last native rebuild bundled camera permission + in-app KYC + the icon.
- **EAS** (authed `kivanov82`, project `@kivanov82/kasu`):
  - Device dev client: `eas build -p ios --profile development`
  - iOS Simulator: `eas build -p ios --profile simulator` then `eas build:run -p ios --latest`
  - Apple: Developer Program enrolled (**Individual** — must convert to
    Organization before real Apple-login users / App Store; SIWA `sub` is
    team-scoped). Sign in with Apple + custom Apple OAuth creds set in Privy.
- **`expo run:ios` (local) is broken on this Mac** — CocoaPods; use EAS.
- Typecheck `npx tsc --noEmit`; lint `npx expo lint` (a few pre-existing
  react-hooks/immutability + set-state-in-effect items are unrelated noise).

## Roadmap (plan doc §1b, Phases A–E)
- **A. De-crypto + 1:1 UX** — ✅ vocabulary sweep, Home/Earn/Rewards IA, Plasma
  Home + Earn, onboarding, card-flip management, Add funds sheet. (A6 residency
  gate / consent modal / limit presets still to do.)
- **B. KYC** — Compilot kept for lending now; **Sumsub migration is pre-live**
  (native RN SDK, avoids the mobile-Compilot WebView problem, but needs the Kasu
  signer service for the on-chain deposit auth — plan §3.2).
- **C. Card, looking real** — ✅ done (backend live, silent session, in-app KYC,
  PAN, funded demo purchases).
- **D. Fiat rail = MoonPay** — Add funds bank/card, withdraw; Bridge as a later
  swap. Not wired (needs MoonPay signup).
- **E. TestFlight** — last.

## Known gaps / follow-ups
- **Mobile Compilot KYC is unbuilt** — Compilot has no hosted URL (iframe SDK +
  wallet-signature auth), so it can't run in a bare WebView. Deferred to the
  Sumsub migration; the lending KYC gate shows a friendly "coming shortly".
- **Security:** `/mobile/*` controllers are `@Public()` — bind to a wallet
  signature before a real launch (esp. `kyc/status`, returns an email). Tenderly
  RPC URL is in committed `eas.json` — restrict/rotate. Immersve sandbox
  credentials are public (fine); swap to live creds via env at go-live.
- **Immersve regions** — docs now list US as "coming soon" (AU/NZ/UK/EEA live).
