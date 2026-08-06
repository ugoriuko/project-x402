import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import "dotenv/config";

const PRIVATE_KEY = process.env.CLIENT_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error(
    "Set CLIENT_PRIVATE_KEY in .env — a Base Sepolia TESTNET wallet's private key. " +
      "Run `npm run generate-wallet` if you don't have one yet."
  );
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY);

const client = new x402Client();
registerExactEvmScheme(client, { signer: account });

const payFetch = wrapFetchWithPayment(fetch, client);

const BASE_URL = process.env.SERVER_URL || "http://localhost:3000";

const SNIPPET = `function add(a, b) {\n  var result = a + b;\n  return result;\n}`;

async function main() {
  console.log("Calling free endpoint...");
  const free = await fetch(`${BASE_URL}/api/health`);
  console.log("  ->", await free.json());

  console.log("\nCalling paid endpoint (will auto-pay $0.01 USDC)...");
  const paid = await payFetch(`${BASE_URL}/api/roast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ snippet: SNIPPET }),
  });
  if (!paid.ok) {
    console.error(`  -> payment was not accepted (HTTP ${paid.status}):`, await paid.text());
    process.exitCode = 1;
    return;
  }
  const data = await paid.json();
  console.log("  ->", data);
}

main().catch((err) => {
  console.error("Request failed:", err.message);
  process.exitCode = 1;
});
