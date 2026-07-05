# Working in kasu-mobile

Shared guidance for any agent working in this repo. (Claude Code reads this via
`CLAUDE.md`'s `@AGENTS.md` import; other agents read it directly.)

## Expo SDK 56 — read the versioned docs

Expo changes fast. **Before writing native/Expo code, read the exact versioned
docs at https://docs.expo.dev/versions/v56.0.0/** — APIs differ from older SDKs.

## Stack

React Native + **Expo SDK 56**, expo-router (file-based, typed routes), Privy
embedded wallets (`@privy-io/expo`), ethers v5 + the Kasu SDK, TanStack Query,
react-native-webview. Backend is `kasu-backend` (NestJS) at
`https://backend.kasu.finance`, `/mobile/*` surface.

## The product rule (do not break)

**Zero crypto vocabulary in the UI.** No "USDC / wallet / crypto / DeFi /
on-chain / token / blockchain" in user-facing copy — dollars, Balance, Account,
Card. The wallet/chain are invisible plumbing. Copy Plasma One's UX. See
`CLAUDE.md`.

## Build / run

- **Dev loop:** `npx expo start`, open the **dev client** on the iPhone, hot
  reload. JS changes appear in ~1s — no rebuild. This is the default.
- **A native rebuild is only needed for native changes** (new native modules,
  iOS entitlements/Info.plist, the app icon): `eas build -p ios --profile
  development`, then reinstall via the printed link. Simulator:
  `eas build -p ios --profile simulator` → `eas build:run -p ios --latest`.
- `expo run:ios` (local dev client) is **broken on this Mac** (CocoaPods) — use EAS.
- Always **`npx tsc --noEmit`** before committing; `npx expo lint` (a few
  pre-existing react-hooks warnings are unrelated noise).

## Conventions

- Feature-first layout under `src/features/<feature>/`; shared UI in
  `src/components/ui/`; the `Screen` wrapper handles safe-area + optional
  `onRefresh` (pull-to-refresh).
- `EXPO_PUBLIC_*` env is inlined by Metro at build time — reference each var
  **explicitly** (no dynamic `process.env[...]` lookup). Local values in `.env`
  (gitignored); build values in `eas.json`.
- Haptics via `src/lib/haptics.ts` (tap/select/success/…), fire-and-forget.
- Card numbers / PANs must **never** transit the backend (PCI) — the app fetches
  them from the single-use secure token.

## Orientation

- `docs/IMPLEMENTATION.md` — current state, screen map, card integration, gotchas.
- `docs/mobile-neobank-concept-plan.md` (**workspace root**, one level up) — the
  full roadmap, vendor research, and open decisions.
