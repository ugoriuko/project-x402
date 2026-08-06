import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { SOLANA_DEVNET_CAIP2 } from "@x402/svm";
import { ExactSvmScheme } from "@x402/svm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 4022;

const payTo = process.env.PAY_TO_ADDRESS;
if (!payTo) {
  console.error("Set PAY_TO_ADDRESS in .env (the Solana wallet that should receive payments).");
  process.exit(1);
}

// Public testnet facilitator — same one used in the EVM examples. Not a
// production path; see the README's "what changes for mainnet" section.
const facilitatorUrl = process.env.FACILITATOR_URL || "https://x402.org/facilitator";
const facilitator = new HTTPFacilitatorClient({ url: facilitatorUrl });

// SOLANA_DEVNET_CAIP2 is the real network identifier — not a string to
// guess. It's a CAIP-2 id built from the devnet genesis hash, not the
// literal string "solana:devnet".
//
// Deliberately not passing an rpcUrl here: when ExactSvmScheme has one, it
// embeds a fresh `extra.recentBlockhash` in every 402 challenge it builds —
// including the one generated internally while validating the paid retry.
// Since that's a *different* blockhash than the one the client signed
// against, requirement-matching fails with "No matching payment
// requirements" on every single request. Omitting rpcUrl leaves `extra`
// empty and lets the client source its own recent blockhash instead. See
// this project's README for the full story.
const resourceServer = new x402ResourceServer(facilitator).register(
  SOLANA_DEVNET_CAIP2,
  new ExactSvmScheme()
);

app.use(
  paymentMiddleware(
    {
      "GET /api/lucky-number": {
        accepts: {
          scheme: "exact",
          price: "$0.01",
          network: SOLANA_DEVNET_CAIP2,
          payTo,
        },
        description: "One lucky number (1-100), priced per call.",
        mimeType: "application/json",
      },
    },
    resourceServer
  )
);

app.get("/api/lucky-number", (req, res) => {
  const number = Math.floor(Math.random() * 100) + 1;
  res.json({ number, paid: true });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`x402-gated API running at http://localhost:${PORT}`);
  console.log(`  Free:   GET http://localhost:${PORT}/api/health`);
  console.log(`  Paid:   GET http://localhost:${PORT}/api/lucky-number  ($0.01 USDC, Solana devnet)`);
});
