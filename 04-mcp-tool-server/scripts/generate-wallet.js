// One-shot helper: generates a fresh EVM keypair for use as a Base Sepolia
// TESTNET wallet. Prints the key once so you can paste it into your own
// .env file. Does not write to disk anywhere in this repo.
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

console.log("Generated a new testnet wallet.\n");
console.log(`  Address:     ${account.address}`);
console.log(`  Private key: ${privateKey}\n`);
console.log("Next steps:");
console.log("  1. Paste the address into PAY_TO_ADDRESS in your .env (server side).");
console.log("  2. Paste the private key into CLIENT_PRIVATE_KEY in your .env (client side)");
console.log("     — or generate a second wallet if you want payer and payee to differ.");
console.log("  3. Fund the address with Base Sepolia ETH + testnet USDC (see README).");
console.log("\nTESTNET ONLY. Never fund this address on mainnet or reuse this key anywhere real.");
