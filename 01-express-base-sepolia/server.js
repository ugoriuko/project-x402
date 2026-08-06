import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 4021;

const payTo = process.env.PAY_TO_ADDRESS;
if (!payTo) {
  console.error("Set PAY_TO_ADDRESS in .env (the wallet that should receive payments).");
  process.exit(1);
}

// Public testnet facilitator: verifies and settles payments so this server
// doesn't need its own blockchain infrastructure. Not a production path —
// see the README's "what changes for mainnet" section.
const facilitatorUrl = process.env.FACILITATOR_URL || "https://x402.org/facilitator";
const facilitator = new HTTPFacilitatorClient({ url: facilitatorUrl });

// eip155:84532 = Base Sepolia (EVM testnet chain id 84532)
const resourceServer = new x402ResourceServer(facilitator).register(
  "eip155:84532",
  new ExactEvmScheme()
);

app.use(
  paymentMiddleware(
    {
      "GET /api/quote": {
        accepts: {
          scheme: "exact",
          price: "$0.01",
          network: "eip155:84532",
          payTo,
        },
        description: "One random motivational quote, priced per call.",
        mimeType: "application/json",
      },
    },
    resourceServer
  )
);

app.get("/api/quote", (req, res) => {
  const quotes = [
    "The obstacle is the way.",
    "Do the work; let the results follow.",
    "Small steps, repeated, beat big plans, abandoned.",
    "You don't rise to your goals, you fall to your systems.",
  ];
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  res.json({ quote, paid: true });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`x402-gated API running at http://localhost:${PORT}`);
  console.log(`  Free:   GET http://localhost:${PORT}/api/health`);
  console.log(`  Paid:   GET http://localhost:${PORT}/api/quote  ($0.01 USDC, Base Sepolia)`);
});
