import { x402ResourceServer } from "@x402/core/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";

// Next.js loads .env / .env.local automatically — no dotenv import needed
// here, unlike the standalone client.js script that runs outside Next.
const payTo = process.env.PAY_TO_ADDRESS;
if (!payTo) {
  throw new Error("Set PAY_TO_ADDRESS in .env (the wallet that should receive payments).");
}

const facilitatorUrl = process.env.FACILITATOR_URL || "https://x402.org/facilitator";
const facilitator = new HTTPFacilitatorClient({ url: facilitatorUrl });

// eip155:84532 = Base Sepolia (EVM testnet chain id 84532)
export const resourceServer = new x402ResourceServer(facilitator).register(
  "eip155:84532",
  new ExactEvmScheme()
);

export const payToAddress = payTo;
