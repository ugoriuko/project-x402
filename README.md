# x402 integration portfolio

[x402](https://docs.x402.org) is an open payment protocol — originally from
Coinbase, now under the Linux Foundation / x402 Foundation — that revives
the long-dormant HTTP `402 Payment Required` status code. An API can gate
any route behind a price; a client (human-driven or an autonomous AI agent)
that hits it without paying gets a `402` back with the exact price and
payment method, signs a stablecoin payment for that amount, and retries —
no API keys, no subscriptions, no account creation. This repo is four
working implementations of that pattern, each isolating a different piece
of the integration surface.

## The four projects

| # | Project | What it demonstrates |
|---|---------|----------------------|
| 01 | [`01-express-base-sepolia`](01-express-base-sepolia/) | The baseline pattern: Express + `@x402/express`, a $0.01 USDC paywall on Base Sepolia testnet, a client that auto-pays on 402. |
| 02 | [`02-nextjs-api-route`](02-nextjs-api-route/) | Same pattern on a Next.js App Router API route via `@x402/next` — a different toy resource, and a look at how the route-handler-wrapping approach differs from Express middleware. |
| 03 | [`03-solana-variant`](03-solana-variant/) | The same paywall on Solana devnet via `@x402/svm` instead of `@x402/evm` — what actually changes moving from an EVM chain to Solana (network identifiers, signing, dependency pinning). |
| 04 | [`04-mcp-tool-server`](04-mcp-tool-server/) | An MCP tool server with a payment-gated tool via `@x402/mcp`, plus a demo client — the piece that's directly relevant to AI agents paying for tool calls, not just HTTP requests. |

Each project is standalone: its own `package.json`, `README.md`, and
`.env.example`. None of them share dependencies or need to be run together.

## Before you run any of them

Every project is **testnet/devnet only**. Each `README.md` says so, each
`.env.example` says so, and this repo ships a pre-commit hook
(`.githooks/pre-commit`) that blocks commits containing anything shaped
like a real private key, on top of `.env` being gitignored everywhere. Git
doesn't enable hooks from a fresh clone automatically — run this once per
clone to turn it on:

```bash
git config core.hooksPath .githooks
```

That's a safety net, not a substitute for not pasting a real key into a
testnet demo in the first place.

Every project also has a `generate-wallet` script if you don't already have
a funded test wallet, and every `README.md` links the specific faucets that
were actually confirmed working while building it.

## Why I built this

x402 is early enough that "add x402 payments to your existing API" is a
real, scoped, few-hours-to-a-day piece of work — not a research project.
Most of what it takes is exactly what these four projects show: pick a
network, pick a facilitator, wrap the route or tool you're monetizing, and
verify it against the real facilitator before calling it done.

That last part is the part that actually takes judgment. Every one of these
four projects hit at least one place where the documented pattern didn't
match the installed package version, or where a peer dependency silently
resolved to something incompatible, or where a configuration choice that
looked reasonable broke payment verification in a way that only showed up
against a live facilitator, not from reading the docs. All of that is
written up in each project's README as it was found — not smoothed over,
because knowing where those edges are is most of what you're paying for
when you bring someone in to do this instead of doing it yourself.

If you have an API and want a payment gate added to a route, or a tool
exposed to agents behind a per-call price, this is the exact scope of work:
fork the closest matching project here, swap in your resource and your
wallet, verify it against a testnet facilitator, then move to production
facilitator and mainnet. That's an afternoon, not a sprint.

## Resources

- Protocol docs: https://docs.x402.org
- Reference repo: https://github.com/x402-foundation/x402
- Facilitator directory: https://docs.x402.org/dev-tools/facilitators

See [`docs/writeup.md`](docs/writeup.md) for a longer technical walkthrough
of what was actually different across the four variants.
