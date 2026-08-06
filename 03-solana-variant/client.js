import { createKeyPairSignerFromBytes, getBase58Encoder } from "@solana/kit";
import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { registerExactSvmScheme } from "@x402/svm/exact/client";
import "dotenv/config";

const PRIVATE_KEY = process.env.CLIENT_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error(
    "Set CLIENT_PRIVATE_KEY in .env — a base58-encoded Solana devnet TESTNET " +
      "secret key. Run `npm run generate-wallet` if you don't have one yet."
  );
  process.exit(1);
}

const secretKeyBytes = new Uint8Array(getBase58Encoder().encode(PRIVATE_KEY));
const signer = await createKeyPairSignerFromBytes(secretKeyBytes);

// Same shape as the EVM client: an x402Client needs a scheme registered
// per network before it can build payment payloads.
const client = new x402Client();
registerExactSvmScheme(client, { signer });

const payFetch = wrapFetchWithPayment(fetch, client);

const BASE_URL = process.env.SERVER_URL || "http://localhost:4022";

async function main() {
  console.log("Calling free endpoint...");
  const free = await fetch(`${BASE_URL}/api/health`);
  console.log("  ->", await free.json());

  console.log("\nCalling paid endpoint (will auto-pay $0.01 USDC)...");
  const paid = await payFetch(`${BASE_URL}/api/lucky-number`);
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
