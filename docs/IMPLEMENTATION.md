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

## Current state (2026-07-08)

- **Runs as a dev client on a real iPhone** (EAS `development` profile) with
  **Metro hot reload** (`npx expo start`) — JS changes appear in ~1s, no rebuild.
- **Real login** — email OTP / Google / Apple via Privy embedded wallets (plain
  EOA). No demo mode.
- **Backend live in prod** — `kasu-backend` on Lightsail (`backend.kasu.finance`),
  the whole `/mobile/*` surface enabled (`MOBILE_ENABLED=true`). Current image
  **v40** (81 env keys: `IMMERSVE_*`, `MOONPAY_*`, `MOBILE_ENABLED`, `NEXERA_*`, …).
- **Card works end-to-end** on the Immersve sandbox (silent session → in-app
  identity check → create/activate → real PAN → funded balance + seeded purchases).
- **Push notifications work end-to-end** — a card purchase fires a real APNs
  push (banner + in-app Alerts feed). Verified on device.
- Dark-only, branded (brass `#d29e61`, DM Sans + Crimson Text serif, gold-bonsai
  card, brass app icon).

### What's real vs stubbed
| Area | State |
|---|---|
| Login (email/Google/Apple), embedded wallet | ✅ real |
| Lending strategies, APY, portfolio, ticking yield | ✅ real (on-chain via SDK) |
| Card: onboarding, KYC, PAN reveal, top-up, purchases | ✅ real on the **Immersve sandbox** |
| Activity feed (lending + card + **on-chain USDC transfers**) | ✅ real — transfers scraped from the Tenderly RPC (`eth_getLogs`, ~1mo) |
| **Add funds → From another account** (deposit) | ✅ real — QR of the account number, live "received" watch (USDC on Base) |
| **Send → account number** (P2P) | ✅ real — gasless-intent USDC transfer via Privy (see gas note) |
| **Push notifications** (card purchase → APNs) | ✅ real; settings screen w/ master + category toggles |
| Profile + account details + legal links | ✅ real |
| **Rewards/Tier** (points, cashback, payouts) | ✅ real-but-fake — derived from the real card purchases (2% cashback, points/$); referrals $0, Buy-points is a preview |
| **Add funds → Debit card** (MoonPay) | 🔶 integration correct + live in **sandbox**; MoonPay geo-blocks the test region → shows "coming soon to your region". Real money after MoonPay KYB (key swap). |
| **Add funds → Bank transfer** (Bridge) | 🔶 Plasma-style **preview** ("coming soon — Bridge"), copy/share disabled |
| **Send → Bank account** (Bridge off-ramp) | 🔶 Plasma-style **preview** (currency → rail form), Send disabled |
| Lending **Lend** (deposit) | 🔶 KYC-gated — amount screen is built but the Lend button is disabled ("verify to earn") since no mobile user is KYC'd |
| Lending KYC (Compilot) on mobile | 🔶 deferred — unbuilt gap; folded into the Sumsub migration |
| **Gasless transactions** | 🔶 deferred — Privy Expo can't sponsor EOA gas (see gotchas); needs a gas tank / EIP-3009 relayer |

## IA / screen map
Tabs: **Home / Earn / Rewards**. No page titles — the tab bar names the screen.
Each tab shows a **`TabHeader`**: profile avatar (→ `/profile`) top-left, and a
**"?" help button** top-right **only on Earn** (explains strategies). Everything
else is a pushed route with a **`ScreenHeader`** (circular back + centered title
+ optional right slot).

- **Home** (`app/(tabs)/index.tsx`) — the **card is the hero**. Tapping it flips
  it (revealing the real PAN) and swaps the content below for **card management**
  (balance, top up, activity, sample purchase). Flipping back: **one unified
  balance** (wallet + card) on the card face, two actions (**Add funds** / **Send**),
  and the merged activity feed (5 rows + "View all" → `/activity`). Pull to refresh.
- **Earn** (`app/(tabs)/earn.tsx` → `lending-screen`) — two gradient hero panels:
  **Weekly top up** (`EpochYield`, Thursday countdown) and **Total invested**
  (`Portfolio`, compact: invested + lifetime-yield ticker on one row) → the
  strategies list. `?` explains earning. Strategy card → detail (`/lending/[poolId]`):
  name + **Options** (tranches, "Choose your repayment priority", Full ones hidden,
  each tappable) → **amount screen** (`LendAmount`, Plasma keypad + 25/50/75%,
  **Lend KYC-gated/disabled**). Key data + About live behind the detail `?`.
- **Rewards** (`app/(tabs)/rewards.tsx`) — Plasma's "Tier" screen: tier (**Silver**)
  + **Points** (1/$ spent), a rewards card (cashback + referrals), payouts
  **derived from the real card purchases** (`use-rewards.ts`: 2% on the first $500/mo
  + 0.1% after), and Cashback / Referrals explainer sheets (with an svg progress
  ring). Fake-but-connected; referrals $0 (not wired). "Buy points" (`/buy-points`)
  is Plasma's Convert screen (USD → Points, Kasu mark), Continue is a preview.
- **Activity** (`app/activity.tsx`) — Activity / Alerts segments (Payments segment
  removed). Feed merges lending (SDK) + card purchases (Immersve) + on-chain USDC
  transfers (Tenderly). Tap a row → detail sheet.
- **Profile** (`app/profile.tsx`) — inline account panel (name, email, copyable
  account number, verification, member-since), settings menu, real legal links
  (`docs.kasu.finance`), version, sign out. `/notifications-settings` (master +
  category toggles) hangs off it.
- **Money movement** — `/deposit` (QR receive), `/bank-transfer` (Bridge preview),
  `/send-bank` (Bridge off-ramp preview); Send P2P is a bottom sheet.
- **Onboarding** (`app/(auth)/`) — welcome → features carousel → login.

## Card integration (Immersve) — the centerpiece
Non-custodial: the user's Privy embedded **EOA** funds a Mastercard on the
Immersve rail (smart-account sigs are rejected by Immersve — verified — so plain
EOA; plan §3.1).

App (`src/features/card/`): `use-card-session.ts` (silent SIWE), `use-card-status.ts`
(state machine), `card-screen.tsx` (onboarding), `app/card-kyc.tsx` (in-app KYC
WebView), `card-management.tsx` (flipped panel), `use-card-pan.ts` (single-use
secure token — PANs never transit the backend, PCI), `use-card-demo.ts` (sandbox
seed; `notify:false` so seeding doesn't push).

Backend (`kasu-backend/src/mobile/card/`): `immersve.client.ts` + in-memory
`immersve-session.store.ts` + `mobile-card.service.ts`. Endpoints: session
init/complete, status, contact, create, pan-token, topup, transactions,
`demo/simulate-purchase` (sandbox-only; on success fires a purchase **push**).

## Notifications (F5) — live
- **Register:** `use-register-push.ts` gets the Expo push token → `/mobile/
  notifications/register-push` (stored per wallet). Master toggle in
  `/notifications-settings` gates registration (`useNotificationPrefs`).
- **Deliver:** `PushDispatchService.sendToAddress` → Expo Push API → APNs/FCM.
- **Trigger (live):** `simulatePurchase` → "Purchase approved" push. The app's
  `NotificationsProvider` auto-appends received pushes to the in-app Alerts feed.
- **Deferred:** on-chain event detectors (money in/out, weekly interest), MoonPay
  webhook, and **per-category backend gating** (prefs are local-only today).
- **Prereq:** the EAS project must have an APNs key for delivery.

## Money-reload bus
`src/lib/refresh.ts` — `refreshFinancials()` invalidates all money-related query
keys (balance, lending/portfolio, card, activity, on-chain transfers). All
financial data is TanStack Query, so invalidation IS the event bus. Called on
deposit-received, send-complete, MoonPay return; drop it into any future
money-moving action.

## Backend deploy notes
- `./deploy.sh` — build linux/amd64 → push → **read the live env back and re-apply
  with the new image** (never wipes the env map). Env-only changes use the guarded
  read-merge-write (e.g. `MOONPAY_BASE_CURRENCY`).
- **Build gotcha:** the Docker `npm` cache can corrupt (`EEXIST /root/.npm/
  _cacache`) → a silently-failed build pushes a STALE image. Fix: `docker builder
  prune -af` then rebuild; verify `docker images kasu-backend:latest` is fresh
  before deploying.

## Architecture & non-obvious gotchas
- **Entry / polyfills** — `index.js` loads `crypto-polyfills.ts` before router.
- **Metro** — package-exports order `['react-native','browser','require']` so
  Privy's `jose` uses WebCrypto.
- **Providers at ROOT** — `SdkProvider` + `NotificationsProvider` in `_layout.tsx`.
  `_layout` also **preloads** balance + card + card-session behind the splash so
  Home paints with numbers ready (splash held to ≤3.5s).
- **Privy send gotcha (IMPORTANT)** — the Expo embedded-wallet provider reads
  **`gasLimit`** (not the JSON-RPC `gas` field) and **does not sponsor EOA gas**
  (it signs client-side + broadcasts). Send must estimate gas and pass `gasLimit`;
  gasless needs a backend gas tank / EIP-3009 relayer (deferred, plan §8). See
  `use-ethers-signer.ts`.
- **SDK config override** — `UNUSED_LENDING_POOL_IDS: ['0x000…000']` sentinel
  (empty list returns zero pools).
- **Read-only SDK** pre-login via `JsonRpcProvider`.
- **Base RPC** — `EXPO_PUBLIC_BASE_RPC_URL` (Tenderly gateway); accepts a full
  ~1-month `eth_getLogs` range in one call (used for the transfers feed).
- **SDK amount units** — `tranche.investedAmount`/`*.yieldEarnings` are
  ether-formatted $; `pool.totalInvestedAmount` is 6-decimal base units (÷1e6).
- **Unified balance** — Home shows wallet + card funding summed (two pockets, one
  number); a deposit lands in the wallet, a card top-up moves it to the card.
- **Gradients without a native rebuild** — `GradientCard` uses the already-linked
  `react-native-svg` (not `expo-linear-gradient`).

## Build / run
- **Dev loop:** `npx expo start` + hot reload on the device dev client. Rebuild
  (EAS) only for native changes (new native modules, entitlements/Info.plist, icon).
- **EAS** (`kivanov82`, `@kivanov82/kasu`): dev client `eas build -p ios --profile
  development`; simulator `--profile simulator` then `eas build:run`. `expo run:ios`
  is broken locally (CocoaPods) — use EAS.
- Apple: Program enrolled (**Individual** — convert to Organization before real
  Apple-login users / App Store). SIWA + custom Apple OAuth creds set in Privy.
- Typecheck `npx tsc --noEmit`; lint `npx expo lint` (pre-existing react-hooks /
  set-state-in-effect noise in a couple of tickers).

## Roadmap (plan doc §1b, Phases A–E)
- **A. De-crypto + 1:1 UX** — ✅ done (vocabulary, IA, Plasma Home/Earn/Add-funds/
  Send, onboarding, card-flip, profile, notifications, gradient Earn redesign).
- **B. KYC** — Compilot deferred on mobile; **Sumsub migration is pre-live**.
- **C. Card, looking real** — ✅ done.
- **D. Fiat rails** — MoonPay card top-up **live in sandbox** (region-blocked in
  test); deposit QR is the working funding rail. Bank transfer + bank send are
  Bridge **previews**. Withdraw/off-ramp still to wire.
- **E. TestFlight** — last.

## Known gaps / follow-ups
- **Gasless EOA (deferred)** — Send/Lend need ETH in the wallet; Privy Expo can't
  sponsor EOA gas. Add a backend gas tank (recommended) or EIP-3009 relayer.
- **MoonPay region** — sandbox blocks the test region for USDC-on-Base; MoonPay
  account/onboarding matter, not our code. Real money after KYB (key swap).
- **Mobile Compilot KYC unbuilt** — no hosted URL; folded into the Sumsub
  migration. (Sumsub's native SDK avoids Compilot's `createWeb3Challenge` origin
  allowlist entirely.)
- **Security:** `/mobile/*` controllers are `@Public()` — bind to a wallet
  signature before launch (esp. `kyc/status`, returns an email). In-memory
  Immersve sessions are wiped on every deploy (Home re-signs silently).
- **Pre-live:** data-governance/privacy review; Individual→Organization Apple.
