# 04 — MCP tool server + x402

A minimal [MCP](https://modelcontextprotocol.io) server exposing two tools
over stdio: one free, one gated behind an x402 payment per call. This is the
piece that's directly relevant to AI agents — instead of an HTTP client
choosing to pay for an API response, it's an MCP client (Claude Desktop,
Claude Code, or any other MCP-speaking agent) paying per tool call.

- `server.js` — free tool `ping`, paid tool `get-fake-stock-quote` ($0.01
  USDC, Base Sepolia testnet, `exact` scheme). The quote is a random number,
  not real market data — the point of this project is the MCP + x402
  combination, not the tool's usefulness.
- `client.js` — a demo MCP client that spawns `server.js` as a subprocess
  (exactly how Claude Desktop/Code launch a local MCP server), lists tools,
  calls the free one, then auto-pays for the paid one.
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
`CLIENT_PRIVATE_KEY` in `.env`. Same faucets as project 01: the CDP faucet
(https://portal.cdp.coinbase.com/products/faucet) covers both testnet ETH
and testnet USDC on Base Sepolia in one place.

## Run the demo client

```bash
npm run client
```

This spawns the server itself, so you don't run `npm run server` separately
for this — it's only useful standalone when you're pointing a real MCP
client at it (below).

## Pointing a real MCP client at this server

This server only pays off as a demo once something other than `client.js`
talks to it — that's the actual point of an MCP server. Two ways to do it:

**Claude Code** — from this directory:

```bash
claude mcp add x402-demo -- node server.js
```

Or add it to a project's `.mcp.json`:

```json
{
  "mcpServers": {
    "x402-demo": {
      "command": "node",
      "args": ["/absolute/path/to/04-mcp-tool-server/server.js"],
      "env": {
        "PAY_TO_ADDRESS": "0xYourWalletAddressHere",
        "FACILITATOR_URL": "https://x402.org/facilitator"
      }
    }
  }
}
```

**Claude Desktop** — add the same shape to `claude_desktop_config.json`
under `mcpServers`.

**Put `PAY_TO_ADDRESS` directly in the client config's `env` block, not just
in a local `.env` file.** `server.js` still loads `.env` itself via
`dotenv/config`, but that only works if the process's working directory
ends up being this folder — which depends on how the specific MCP client
launches subprocesses, and isn't guaranteed. Setting `env` explicitly in the
MCP config sidesteps that ambiguity entirely.

Once connected, calling `get-fake-stock-quote` from Claude Code / Desktop
will return a 402 payment challenge to the client. Neither Claude Code nor
Claude Desktop currently auto-pay x402 challenges themselves — this project's
`client.js` is a demonstration of what an x402-*aware* MCP client does with
that challenge (see `wrapMCPClientWithPayment` in `client.js`), which is the
piece a real paying agent would need to implement or depend on.

## What's actually non-obvious about MCP + x402

**1. `resourceServer.buildPaymentRequirements()` needs `initialize()` called
first if you use it directly.** The other three projects in this repo use
`paymentMiddleware`, which handles facilitator sync internally on first
request. `@x402/mcp`'s documented pattern — call
`resourceServer.buildPaymentRequirements({...})` yourself, once, before
registering the tool — skips that internal step, so without an explicit
`await resourceServer.initialize()` first, it throws `"Facilitator does not
support exact on eip155:84532. Make sure to call initialize()..."` — which
is at least an honest, actionable error message, not a silent failure.

**2. The payment wrapper is built before the tool has a name.**
`createPaymentWrapper(resourceServer, { accepts, resource })` runs before
`server.registerTool("get-fake-stock-quote", ...)` — the wrapper has no way
to know what name its handler will eventually be registered under. Without
an explicit `resource.url`, the 402 challenge's resource URL defaults to
the generic placeholder `mcp://tool/paid_tool` instead of
`mcp://tool/get-fake-stock-quote`. Pass `resource: { url:
createToolResourceUrl("get-fake-stock-quote") }` explicitly to get an
accurate one — `server.js` does this.

**3. Payment failure surfaces as a normal tool result, not necessarily a
thrown error.** In this project's client, a rejected payment came back as
`callTool()` resolving with `isError: true` and the rejection reason in
`content[0].text` — not a thrown exception. `client.js` checks both
(`isError` and a try/catch around the call) since which one you get can
depend on where in the flow the rejection happens.

**4. stdout is the transport — it's not a place to log.** `StdioServerTransport`
uses stdout for the actual JSON-RPC protocol messages. Any `console.log` in
`server.js` would corrupt the stream and break the connection; all status
output goes to `console.error` (stderr) instead, same as any well-behaved
stdio MCP server.

## What changes for mainnet

Same as project 01 (this uses the same Base Sepolia / EVM setup): swap the
network identifier for a mainnet chain id, fund `PAY_TO_ADDRESS` with a real
wallet, and replace the public `x402.org` facilitator with a production one
— hosted (e.g. Coinbase's CDP facilitator), self-run, or self-facilitating.
See project 01's README for the full breakdown; it's identical here.

## Verified

- `npm install` — `@x402/core`, `@x402/evm`, `@x402/mcp` at `2.21.0`,
  `@modelcontextprotocol/sdk@1.30.0`, `zod@3.25.76` (pinned to satisfy both
  the SDK's `^3.25 || ^4.0` peer range and `@x402/mcp`'s own `^3.24.2`
  dependency — 4.x would violate the latter). `npm audit`: 0 vulnerabilities.
- `node --check` passes on `server.js`, `client.js`, and
  `scripts/generate-wallet.js`.
- End-to-end tested with a real spawned subprocess over real stdio (not a
  mocked transport): `listTools()` returns both tools; the free `ping` tool
  returns immediately; the paid tool correctly triggers a 402 challenge, the
  client signs and submits a real payment, and the facilitator rejects it
  with `invalid_exact_evm_insufficient_balance` for a freshly-generated,
  unfunded wallet — same honest-failure behavior verified in the other three
  projects. A full funded settlement wasn't run — same faucet caveat as
  everywhere else in this repo.
- Not verified: an actual Claude Code / Claude Desktop session calling this
  server. The `claude mcp add` / `.mcp.json` instructions above follow the
  standard MCP stdio-server config shape, but confirm the tool shows up and
  the 402 challenge surfaces sensibly in your own client before relying on
  it — MCP client UX around payment challenges varies and this wasn't
  exercised against Claude's own UI directly.
