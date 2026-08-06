# 02 — Next.js App Router + x402

Same paywall pattern as [`01-express-base-sepolia`](../01-express-base-sepolia),
rebuilt on Next.js (App Router) with `@x402/next` instead of `@x402/express`.
Different toy resource on purpose — a "roast my code snippet" endpoint — so
this doesn't just look like a copy-pasted example.

- `app/api/health/route.js` — free `GET /api/health`.
- `app/api/roast/route.js` — paid `POST /api/roast` ($0.01 USDC, Base
  Sepolia testnet, `exact` scheme). Send `{ "snippet": "..." }`, get back a
  canned roast line. It's a fixed list, not a linter or an LLM call — the
  point of this example is the payment gate, not the roast quality.
- `lib/x402Server.js` — the shared `x402ResourceServer` setup.
- `client.js` — calls both routes; auto-pays the 402 with
  `wrapFetchWithPayment` from `@x402/fetch`, same as project 01.
- `scripts/generate-wallet.js` — generates a fresh testnet keypair.

**TESTNET ONLY. Do not put a real/mainnet private key in these files.**

## Setup

```bash
npm install
cp .env.example .env
```

No existing Base Sepolia wallet? Run:

```bash
npm run generate-wallet
```

Paste the printed address into `PAY_TO_ADDRESS` and the private key into
`CLIENT_PRIVATE_KEY` in `.env`.

### Getting testnet funds

The client wallet needs a little Base Sepolia USDC (and possibly ETH for
gas, depending on settlement path):

- https://portal.cdp.coinbase.com/products/faucet — testnet ETH and USDC on
  Base Sepolia, in one place.
- More options if that's rate-limited:
  https://docs.base.org/base-chain/network-information/network-faucets.

## Run

```bash
npm run dev
```

In a second terminal:

```bash
npm run client
```

## What's actually different from the Express version

- **Route wiring.** Express uses one `paymentMiddleware(...)` call keyed by
  `"METHOD /path"` strings covering every protected route. `@x402/next`'s
  `withX402(handler, routeConfig, resourceServer)` instead wraps one route
  handler at a time — natural fit for how the App Router already splits
  handlers per HTTP method (`export const POST = withX402(...)`). No path or
  method string to keep in sync with the file location; the file path *is*
  the route.
- **Env loading.** Next.js reads `.env` / `.env.local` automatically, so
  `app/api/*/route.js` and `lib/x402Server.js` need no `dotenv` import.
  `client.js` still needs `dotenv/config` explicitly — it runs as a plain
  Node script outside Next's build pipeline.
- **Next 16 scaffolds `AGENTS.md` / `CLAUDE.md` on its own.** First `next dev`
  or `next build` on Next.js 16.3 auto-generates these two files in the
  project root ("agent rules" for AI coding tools). If you don't want them
  checked in, set `agentRules: false` in `next.config.mjs` (done here) —
  otherwise they reappear on every dev/build run. Worth knowing before you
  `git add .` on a fresh Next 16 project and get surprised by two new files.

## What changes for mainnet

Same two moving parts as the Express example:

- **Network** — swap `eip155:84532` for the mainnet chain id (e.g.
  `eip155:8453` for Base) in `lib/x402Server.js` and `app/api/roast/route.js`,
  and fund `PAY_TO_ADDRESS` with a real wallet.
- **Facilitator** — the public `x402.org` facilitator is testnet/dev only.
  Hosted options (e.g. Coinbase's CDP facilitator:
  https://docs.cdp.coinbase.com/x402/docs/quickstart-sellers; full directory:
  https://docs.x402.org/dev-tools/facilitators), running your own, or
  self-facilitating are the production paths — see
  https://docs.x402.org/core-concepts/facilitator.

As with project 01, treat the `.env` pattern here as a testnet/demo
convenience — move real keys into a proper secrets manager before this ever
touches mainnet.

## Verified

- `npm install` — all `@x402/*` packages resolve at `2.21.0`, install
  cleanly alongside `next@16.3.0`, `react@19.2.8`, `react-dom@19.2.8`,
  `viem@2.55.11`, `dotenv@17.4.2`. `npm audit`: 0 vulnerabilities.
- `next build` compiles successfully (this also covers `app/layout.js`'s
  JSX, which plain `node --check` can't parse). `node --check` passes on the
  remaining plain JS files (`client.js`, `scripts/generate-wallet.js`,
  `lib/x402Server.js`, both route handlers).
- End-to-end tested against the real `x402.org` facilitator and Base Sepolia
  RPC: `/api/health` returns 200; an unpaid `/api/roast` returns a
  well-formed 402; the client signs and submits a real payment payload that
  the facilitator evaluates on-chain, correctly rejecting an unfunded test
  wallet with `invalid_exact_evm_insufficient_balance` rather than the
  client mistaking that for success. A full funded settlement wasn't run —
  same caveat as project 01, that needs a human faucet step.
- No API surprises this time — `withX402`, `x402ResourceServer`, and
  `HTTPFacilitatorClient` behaved exactly as documented, unlike
  `wrapFetchWithPayment`'s client-side usage in project 01 (see that
  project's README for what was wrong there and why).
