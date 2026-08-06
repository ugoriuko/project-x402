# 03 — Solana devnet variant

Same paywall pattern as [`01-express-base-sepolia`](../01-express-base-sepolia)
and [`02-nextjs-api-route`](../02-nextjs-api-route), rebuilt on Solana devnet
using `@x402/svm` instead of `@x402/evm`.

**Framework choice: Express, not Next.js.** Either works — `@x402/svm` plugs
into the same `x402ResourceServer` used by both the Express and Next.js
adapters, network choice is orthogonal to framework. Express was picked here
specifically to isolate what's genuinely different about *Solana*, without
also re-explaining Next.js App Router conventions covered in project 02.

- `server.js` — free `GET /api/health`, paid `GET /api/lucky-number` ($0.01
  USDC, Solana devnet, `exact` scheme).
- `client.js` — calls both routes; auto-pays via `wrapFetchWithPayment`, same
  shape as the EVM clients but with a Solana signer.
- `scripts/generate-wallet.js` — generates a fresh devnet keypair.

**DEVNET ONLY. Do not put a real/mainnet secret key in these files.**

## Setup

```bash
npm install
cp .env.example .env
```

No existing Solana devnet wallet? Run:

```bash
npm run generate-wallet
```

Paste the printed address into `PAY_TO_ADDRESS` and the base58 secret key
into `CLIENT_PRIVATE_KEY` in `.env`.

### Getting devnet funds

The client wallet needs devnet SOL (for transaction fees) and devnet USDC
(to actually pay with):

- https://faucet.solana.com — official Solana Foundation devnet SOL faucet
  (rate-limited; GitHub sign-in raises the limit). The `solana airdrop`
  CLI command works too if you have the Solana CLI installed.
- https://faucet.circle.com — Circle's official faucet, select "Solana
  Devnet" and paste your address for devnet USDC.

## Run

```bash
npm run server
```

In a second terminal:

```bash
npm run client
```

## What's actually different about the Solana integration

This is the part worth reading even if you're not touching this project's
code — these are the things that weren't obvious going in.

**1. The network identifier isn't a string you'd guess.** EVM networks are
`eip155:<chainId>` — easy to write from memory. Solana networks are
CAIP-2 identifiers built from the cluster's *genesis hash*:
`SOLANA_DEVNET_CAIP2` from `@x402/svm` resolves to
`solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`, not the literal string
`"solana:devnet"`. Always import the constant; don't hand-write it.

**2. The top-level `@x402/svm` export is a trap.** `import { ExactSvmScheme }
from "@x402/svm"` resolves to a *different, incompatible* class than
`import { ExactSvmScheme } from "@x402/svm/exact/server"` — same name, same
package, wrong one crashes at runtime with
`TypeError: SchemeNetworkServer.parsePrice is not a function` the first time
a route actually needs to price a request. `@x402/evm` has the identical
top-level/subpath split, but the EVM examples in this repo happened to use
the subpath from the start; this project is what surfaced the gotcha. Rule
of thumb: for scheme classes, always import from the specific `/exact/server`
or `/exact/client` subpath, never the package root.

**3. Signing is a different key system, not just a different SDK call.**
EVM uses secp256k1 keys via `viem`; Solana uses Ed25519 keys via
`@solana/kit`. There's no `privateKeyToAccount`-equivalent one-liner for
Solana — a private key on its own isn't a signer, and building one that can
also be *exported* back out (for a `generate-wallet` helper to print) takes
several extra steps: generate a random 32-byte seed yourself, derive an
extractable public key from it, concatenate to the 64-byte format Solana
tooling expects, base58-encode. See `scripts/generate-wallet.js` for the
full sequence and why each step is there — none of it is optional ceremony,
each step exists because the higher-level `generateKeyPairSigner()` helper
(at the version this project pins) deliberately produces non-extractable
keys, which is the right default for code that only signs, but useless for
a script whose entire job is handing you the raw bytes.

**4. `@x402/svm@2.21.0`'s own dependency tree wants an older `@solana/kit`
than "latest".** `@x402/svm` depends on `@solana-program/compute-budget`,
`@solana-program/token`, and `@solana-program/token-2022`, all of which
declare `peer @solana/kit@^5.0`. Installing the newest `@solana/kit`
(`7.0.0` at the time of writing) satisfies `@x402/svm`'s own
`peerDependencies` range (`>=5.1.0`) but *not* those transitive peers —
`npm install` succeeds but silently overrides a real ERESOLVE conflict with
warnings easy to miss. This project pins `@solana/kit` and `@solana/keys` to
`5.5.1` — the actual version npm resolves for the transitive dependency —
specifically to avoid that override. Worth checking `npm install`'s full
output (not just its final "found 0 vulnerabilities" line) any time you add
a package with peer dependencies of its own.

**5. Don't pass an `rpcUrl` to `ExactSvmScheme` for a simple demo.** It's
tempting — the option exists specifically to embed a `recentBlockhash` in
the 402 challenge. But at this SDK version, the server regenerates that
blockhash on *every* request it builds requirements for, including the one
it builds internally while validating your paid retry. Since that's
necessarily a different blockhash than the one your client signed against,
every single payment gets rejected with `"No matching payment
requirements"` — indistinguishable at first glance from an actual client
bug. Omitting `rpcUrl` leaves `extra` empty and avoids the mismatch
entirely; the client sources its own recent blockhash when it builds the
transaction. `server.js` in this project has this commented inline exactly
because it's the kind of thing you'd otherwise burn an hour rediscovering.

**6. The 402 challenge payload itself carries Solana-specific shape.**
Compare an EVM `extra` (`{ name: "USDC", version: "2" }`) to what Solana
sends: `{ feePayer: "..." }` — the address that will pay network fees for
the settlement transaction, a concept that doesn't exist on the EVM side at
this layer.

## What changes for mainnet

Same shape as the EVM examples:

- **Network** — swap `SOLANA_DEVNET_CAIP2` for `SOLANA_MAINNET_CAIP2` (also
  exported from `@x402/svm`) in `server.js`, and fund `PAY_TO_ADDRESS` with
  a real wallet.
- **Facilitator** — the public `x402.org` facilitator is testnet/dev only.
  Of the hosted providers in the x402 facilitator directory
  (https://docs.x402.org/dev-tools/facilitators), Corbits, Dexter, and
  Solvador list Solana support specifically — confirm current coverage
  before picking one, that directory changes. Running your own or
  self-facilitating are the other paths; see
  https://docs.x402.org/core-concepts/facilitator.

As with the other two projects, the `.env` pattern here is a devnet/demo
convenience — move real keys into a proper secrets manager before mainnet.

## Verified

- `npm install` — `@x402/*` at `2.21.0`, `@solana/kit`/`@solana/keys` pinned
  to `5.5.1` (see finding #4 above), `express@5.2.1`, `dotenv@17.4.2`. Zero
  ERESOLVE warnings, zero peer conflicts. `npm audit`: 0 vulnerabilities.
- `node --check` passes on `server.js`, `client.js`, and
  `scripts/generate-wallet.js`.
- End-to-end tested against the real `x402.org` facilitator and Solana
  devnet RPC: `/api/health` returns 200; an unpaid `/api/lucky-number`
  returns a well-formed 402 with the devnet USDC asset address correctly
  auto-resolved from the plain `"$0.01"` price string; the client builds
  and signs a real Solana transaction and submits it; the facilitator
  simulates it against devnet and rejects it with
  `transaction_simulation_failed` for a freshly-generated, unfunded wallet
  — the Solana-side equivalent of EVM's `invalid_exact_evm_insufficient_balance`,
  and the same honest-failure handling in `client.js` as the other two
  projects. A full funded settlement wasn't run — same caveat as projects
  01 and 02, that needs actually funding a wallet via the faucets above.
- Two real bugs were found and fixed during this verification (not just
  reported after the fact): the top-level-vs-subpath `ExactSvmScheme` import
  (finding #2), and the `rpcUrl`/blockhash mismatch (finding #5). Both are
  fixed in the code as committed, not left as known issues.
