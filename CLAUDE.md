@AGENTS.md

# Product

**Motto / core selling point: "Spend yield from your VISA card."**

kasu-mobile is a **neobank** whose hook is that the **yield earned from lending to Kasu is
automatically topped up onto the user's Mastercard** — so users spend their yield directly.
Home is the center of the app: the **card is the hero**, and under it live the balance,
weekly-interest countdown, portfolio, and activity.

## The one rule: zero crypto vocabulary

Copy **Plasma One's** UX 1:1, but with **NO crypto words in the UI** — never "USDC / wallet /
crypto / DeFi / on-chain / token / blockchain". Say dollars, Balance, Account, Card. The target
user is a non-crypto neobank customer; the Privy embedded wallet and the chain are **invisible
plumbing**. The goal is a **fully operational app, everything real, except Mastercard spending**
(Immersve sandbox — which must still *look* real).

Before adding any user-facing copy, check it against this rule.

# Current state & plan

- **Where things are:** `docs/IMPLEMENTATION.md` (this repo) — screen map, card integration,
  backend, build/run, what's real vs stubbed.
- **The roadmap + vendor research + decisions:** `docs/mobile-neobank-concept-plan.md` in the
  **Kasu workspace root** (one level up) — the source of truth for Phases A–E, KYC/card/fiat
  vendor choices, and open decisions.

Quick status: real login (email/Google/Apple via Privy), backend live in prod
(`backend.kasu.finance`, `/mobile/*` enabled), the Immersve card works end-to-end on the sandbox
(silent session → in-app KYC → real PAN → funded demo purchases), tabs are Home/Earn/Rewards.
Dev loop is `npx expo start` + hot reload on the device dev client.
