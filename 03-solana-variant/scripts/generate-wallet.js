// One-shot helper: generates a fresh Solana keypair for use as a devnet
// TESTNET wallet. Prints the address and a base58-encoded secret key once
// so you can paste it into your own .env file. Nothing is written to disk.
//
// @solana/kit's generateKeyPairSigner() (at the version this project pins)
// always produces a non-extractable key, so its raw bytes can never be read
// back out — by design, for code that only ever needs to sign with a key
// it already holds. A generator script's whole job is handing you the raw
// bytes, so it needs the lower-level @solana/keys primitives instead: build
// the private key from a random seed we generate ourselves (so we already
// hold those bytes), derive the public key as an extractable key, and
// concatenate seed + public key into the 64-byte format Solana tooling
// expects (the same shape `solana-keygen` produces).
import { createPrivateKeyFromBytes, getPublicKeyFromPrivateKey } from "@solana/keys";
import { createKeyPairSignerFromBytes, getBase58Decoder, getBase58Encoder } from "@solana/kit";

const seed = crypto.getRandomValues(new Uint8Array(32));

const privateKey = await createPrivateKeyFromBytes(seed, /* extractable */ true);
const publicKey = await getPublicKeyFromPrivateKey(privateKey, /* extractable */ true);
const publicKeyBytes = new Uint8Array(await crypto.subtle.exportKey("raw", publicKey));

const secretKeyBytes = new Uint8Array(64);
secretKeyBytes.set(seed, 0);
secretKeyBytes.set(publicKeyBytes, 32);

const secretKeyBase58 = getBase58Decoder().decode(secretKeyBytes);

// Round-trip through the same path client.js uses, to confirm the encoded
// key actually reconstructs to the expected address before printing it.
const verifyBytes = new Uint8Array(getBase58Encoder().encode(secretKeyBase58));
const signer = await createKeyPairSignerFromBytes(verifyBytes);

console.log("Generated a new devnet wallet.\n");
console.log(`  Address:    ${signer.address}`);
console.log(`  Secret key: ${secretKeyBase58}\n`);
console.log("Next steps:");
console.log("  1. Paste the address into PAY_TO_ADDRESS in your .env (server side).");
console.log("  2. Paste the secret key into CLIENT_PRIVATE_KEY in your .env (client side)");
console.log("     — or generate a second wallet if you want payer and payee to differ.");
console.log("  3. Fund the address with Solana devnet SOL + devnet USDC (see README).");
console.log("\nDEVNET ONLY. Never fund this address on mainnet or reuse this key anywhere real.");
