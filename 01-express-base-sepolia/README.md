# 01 — Express + Base Sepolia

A minimal Express API with one free route and one paywalled route, gated by the
[x402 protocol](https://docs.x402.org). Call the paid route without paying and
you get `402 Payment Required`; call it with a signed payment and you get the
data.

- `server.js` — free `GET /api/health`, paid `GET /api/quote` ($0.01 USDC,
  Base Sepolia testnet, `exact` scheme).
- `client.js` — calls both routes; on the paid one it catches the 402, signs
  a payment, and retries automatically (`wrapFetchWithPayment` from
  `@x402/fetch`) — the way an AI agent would consume this API.
- `scripts/generate-wallet.js` — generates a fresh testnet keypair so you
  don't have to bring your own.

**TESTNET ONLY. Do not put a real/mainnet private key in these files.**

## Setup

```bash
npm install
cp .env.example .env
```

If you don't already have a Base Sepolia wallet:

```bash
npm run generate-wallet
```

This prints an address and private key to your terminal — nothing is written
to disk. Paste the address into `PAY_TO_ADDRESS` and the private key into
`CLIENT_PRIVATE_KEY` in your `.env`. (You can use the same wallet for both, or
generate a second one so payer and payee differ — either works for this demo.)

### Getting testnet funds

The client wallet (`CLIENT_PRIVATE_KEY`) needs a small amount of Base Sepolia
USDC to pay with, and possibly a trace of Base Sepolia ETH for gas depending
on the settlement path. The Coinbase Developer Platform faucet covers both in
one place:

- https://portal.cdp.coinbase.com/products/faucet — testnet ETH (up to
  0.1 ETH / 24h) and testnet USDC on Base Sepolia.

If that's rate-limited, alternatives are listed at
https://docs.base.org/base-chain/network-information/network-faucets.

## Run

```bash
npm run server
```

In a second terminal:

```bash
npm run client
```

Expected output: the health check returns instantly; the quote call pauses
briefly while the client signs and settles a $0.01 USDC payment, then returns
a quote.

## How it works

1. Client requests `GET /api/quote` with no payment.
2. Server responds `402 Payment Required`, describing the price and accepted
   payment method.
3. Client signs a payment for that exact amount and retries with the
   signature attached.
4. Server verifies and settles the payment via the **facilitator** — here,
   the public `x402.org` testnet facilitator, so this server doesn't need its
   own blockchain infrastructure.
5. Once verified, the route handler runs and returns data. The handler itself
   (`app.get("/api/quote", ...)`) never touches payment logic — the
   `paymentMiddleware` from `@x402/express` owns all of it.

## What changes for mainnet

Two things move: the network identifier and the facilitator.

- **Network**: swap `eip155:84532` (Base Sepolia) for the mainnet chain id
  you're targeting (e.g. `eip155:8453` for Base mainnet), and fund
  `PAY_TO_ADDRESS` with a real wallet.
- **Facilitator**: the public `x402.org` facilitator is explicitly a
  testnet/dev tool, not a production path. Options, in order of how much
  infrastructure you take on:
  - **Hosted** — a managed facilitator provider verifies and settles on your
    behalf. Coinbase's CDP-hosted facilitator is one option
    (https://docs.cdp.coinbase.com/x402/docs/quickstart-sellers); the current
    directory of providers (with network coverage) is at
    https://docs.x402.org/dev-tools/facilitators.
  - **Self-run** — run the facilitator role yourself as a separate service.
  - **Self-facilitating** — the resource server settles its own payments
    directly, no separate facilitator process. Reference implementation:
    https://github.com/x402-foundation/x402/tree/main/examples/typescript/servers/self-facilitation.

  Full background: https://docs.x402.org/core-concepts/facilitator.

This is also the point where you'd want to actually rotate `PAY_TO_ADDRESS`
and `CLIENT_PRIVATE_KEY` out of `.env` files entirely and into a real secrets
manager — this repo's `.env` pattern is a testnet/demo convenience, not a
production key-handling story.

## Verified

- `npm install` — all `@x402/*` packages resolve at the same `2.21.0` and
  install cleanly alongside `express@5.2.1`, `viem@2.55.11`, `dotenv@17.4.2`,
  with zero peer-dependency conflicts. `npm audit` reports 0 vulnerabilities.
- `node --check` passes on `server.js`, `client.js`, and
  `scripts/generate-wallet.js`.
- End-to-end tested against the real `x402.org` testnet facilitator and Base
  Sepolia RPC (not mocked): `/api/health` returns 200, an unpaid
  `/api/quote` returns a well-formed 402 with the price/network/payTo terms
  encoded in the `PAYMENT-REQUIRED` header, and the client correctly signs
  and submits a real payment payload that the facilitator evaluates on-chain
  — confirmed by generating a fresh unfunded wallet and observing the
  facilitator reject it with `invalid_exact_evm_insufficient_balance` rather
  than the client silently treating that as success. A full $0.01 settlement
  with an actually-funded wallet wasn't run here, since funding one requires
  a human faucet step — that's on you to confirm once you've funded
  `CLIENT_PRIVATE_KEY`.

### API detail worth flagging

The `@x402/fetch` docstring examples (and some pattern references you'll see
elsewhere) show `wrapFetchWithPayment(fetch, account)` taking a bare signer.
At `2.21.0` that's not the actual signature — `wrapFetchWithPayment` needs an
`x402Client` (or `x402HTTPClient`) with a scheme registered for the network
you're paying on:

```js
import { x402Client } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";

const client = new x402Client();
registerExactEvmScheme(client, { signer: account }); // account = a viem LocalAccount
const payFetch = wrapFetchWithPayment(fetch, client);
```

Passing a raw account directly fails at runtime with
`client.createPaymentPayload is not a function` — worth knowing since it's an
easy mistake to carry over from an older example or from memory.
