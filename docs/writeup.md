# Four ways to add x402 payments to an API

*Draft — notes from building four working x402 integrations side by side.*

x402 gates an HTTP resource (or, in one of these four, an MCP tool call)
behind a price. Hit it without paying and you get a `402` back with the
price, network, and recipient encoded in a header. Sign a payment for that
exact amount, retry, get your data. No accounts, no API keys.

I built the same paywall four times — Express on Base Sepolia, Next.js App
Router on Base Sepolia, Express on Solana devnet, and an MCP tool server —
specifically to find out what's actually the same across them and what
isn't. This is what was genuinely different, not what the docs say should
be different.

## What doesn't change

Underneath all four, the shape is identical: a facilitator (a service that
verifies and settles payments so your API doesn't need its own blockchain
infrastructure), a resource server registered with one scheme per network,
and a wrapper around whatever you're monetizing — middleware for Express,
a handler wrapper for Next.js, a payment wrapper for an MCP tool. All four
projects here use the same public `x402.org` testnet facilitator, and it
worked identically for EVM and Solana. That consistency is the actual pitch
of the protocol: the facilitator abstraction means "which chain" is mostly
a config choice, not a different integration.

## Facilitators and faucets, practically

The public facilitator is fine for all of this and explicitly not a
production path — it says so in its own docs. For real usage you're
choosing between a hosted facilitator (Coinbase's CDP-hosted one is the
most visible, but the facilitator directory lists others with different
network coverage), running your own, or self-facilitating (the resource
server settles its own payments, no separate facilitator process). Which
one makes sense depends entirely on how much infrastructure you already run
and which networks you need — there's no default answer.

Testnet funding was more fragmented than I expected: Base Sepolia is one
faucet (Coinbase's CDP faucet gives you both testnet ETH and testnet USDC
in one place), Solana devnet is two (`faucet.solana.com` for SOL,
`faucet.circle.com` for USDC). Neither is instant or unlimited — both are
rate-limited, and I ended up testing the actual rejection path (an unfunded
wallet's payment getting correctly refused) far more than a funded one,
because getting devnet funds took longer than writing the integration code.

## EVM vs Solana: signing is the real difference, not the network string

The network identifier is a config value either way, though Solana's is
worth knowing about: EVM networks are `eip155:<chainId>`, easy to write
from memory. Solana networks are CAIP-2 identifiers built from the
cluster's genesis hash — `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` for
devnet, not a string you'd guess. Always import the SDK's exported
constant.

The bigger difference is signing. EVM uses secp256k1 keys via `viem`, where
`privateKeyToAccount(key)` gets you a usable signer in one line. Solana
uses Ed25519 via `@solana/kit`, and there's no equivalent one-liner — the
higher-level key-generation helper deliberately produces a non-extractable
key, meaning you can generate a signer but can't get its raw bytes back
out. That's the right default for code that only signs, but it means a
"generate me a wallet and print the private key" script needs to drop to
lower-level primitives: build the private key from a seed you generated
yourself (so you already have the bytes), derive an extractable public key,
concatenate into the 64-byte format Solana tooling expects. None of that is
hard, but it's real extra work that doesn't exist on the EVM side, and it's
not something the high-level docs mention because the high-level docs
assume you're signing, not generating throwaway keys for a demo.

Dependency pinning bit here too: the Solana SDK's own transitive
dependencies wanted an older major version of `@solana/kit` than what's
currently published as "latest." `npm install` succeeded either way — it
just quietly overrode a real peer conflict with a warning easy to miss in
normal output. Pinning exact versions and actually reading `npm install`'s
full output, not just its last line, is what caught it.

## What's specific to MCP

MCP tool payments are the same protocol, different transport — but the
wiring has its own sharp edges. The documented pattern calls
`resourceServer.buildPaymentRequirements()` directly instead of going
through Express or Next.js middleware, and that direct path needs an
explicit `resourceServer.initialize()` first to sync with the facilitator;
the middleware-based approach in the other three projects does that sync
for you. Skip it and you get a clear error, at least, but it's an extra
step that's easy to miss coming from the HTTP-side examples.

The payment wrapper also gets built *before* the tool is registered with a
name, so it can't infer its own resource identifier — worth setting
explicitly rather than shipping with a generic placeholder in your 402
challenges. And a rejected payment can come back as a normal tool result
with an error flag rather than a thrown exception, so client code needs to
check both paths, not just wrap the call in a try/catch and assume that's
sufficient.

One thing worth being direct about: neither Claude Desktop nor Claude Code
currently pays x402 challenges automatically. Pointing them at a payment-
gated MCP tool gets you the 402 challenge, not an automatic payment — the
paying side has to be built into the client, same as the HTTP examples.

## The pattern underneath the differences

The recurring lesson across all four wasn't chain-specific — it was that
the installed package version and the documentation examples drift from
each other in small, specific ways, and the only way to know is to actually
run the thing against a live facilitator and read the error when it's
wrong. Two of the four projects hit the identical failure mode: importing a
scheme class from a package's top-level export instead of its specific
`/exact/server` or `/exact/client` subpath silently gets a different,
incompatible class with the same name. That's not a chain-specific gotcha —
it's a "don't trust the package root, use the documented subpath" gotcha
that happened to show up twice.

None of these four projects needed more than a day, faucet rate limits
included. That's the actual scope of adding x402 to an existing API: small,
mechanical, and worth verifying against a real facilitator before you call
it done.
