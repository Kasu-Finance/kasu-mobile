# Kasu Mobile

A React Native (Expo SDK 56) neobank wallet for **lending to Kasu**.

> **Spend yield from your VISA card** — the yield you earn lending to Kasu pools is
> automatically topped up onto your VISA debit card.

## What it does

- **Wallet & login** — Privy embedded wallets (email / Google / Apple / external
  wallet), shared with the Kasu web app.
- **Home** — your VISA card, a *"weekly top up"* counter (the $ yield credited to
  the card at the next epoch), and your lending portfolio.
- **Lend** — browse Kasu strategies and view per-strategy details (APY, TVL,
  capacity, tranches).
- **Activity** — deposits, withdrawals, and yield, with tap-to-expand details.
- **Add funds / Withdraw** — fiat on/off-ramp via Wayex; deposit USDC directly.
- **Card** — a Gnosis Pay virtual debit card.

## Tech

Expo SDK 56 · expo-router · TypeScript · ethers v5 · `@privy-io/expo` ·
`@kasufinance/kasu-sdk` · TanStack Query. Backend: the `/mobile/*` surface of
`kasu-backend` (NestJS).

## Getting started

```bash
cp .env.example .env        # fill in the Privy app id + client id
npx tsc --noEmit            # typecheck
npx expo run:ios            # dev client (Privy + native crypto need one — not Expo Go)
```

Builds use [EAS](https://expo.dev/eas):

```bash
eas build --platform ios --profile simulator   # iOS Simulator
eas build --platform android --profile preview  # installable Android APK
```

See [`docs/IMPLEMENTATION.md`](docs/IMPLEMENTATION.md) for architecture, the demo
mode, key gotchas, and the roadmap.

## Notes

- A **demo mode** (`EXPO_PUBLIC_DEV_LOGIN_BYPASS` + `EXPO_PUBLIC_DEMO_PORTFOLIO_ADDRESS`)
  lets the app run read-only against a real on-chain portfolio — useful on the iOS
  Simulator, where Privy login can't complete (Apple App Attest).
- UI is functionally complete; brand styling to the Kasu design system is the next
  phase.
