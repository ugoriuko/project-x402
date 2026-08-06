import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { wrapMCPClientWithPayment } from "@x402/mcp";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";
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

const paymentClient = new x402Client().register("eip155:84532", new ExactEvmScheme(account));

const mcpClient = new Client({ name: "x402-mcp-demo-client", version: "1.0.0" });

// This is exactly how Claude Desktop / Claude Code launch a local MCP
// server: spawn it as a subprocess and speak MCP over its stdin/stdout.
// cwd is pinned to this project so the server's own `dotenv/config` finds
// the right .env regardless of where this script is invoked from.
const transport = new StdioClientTransport({
  command: "node",
  args: ["server.js"],
  cwd: import.meta.dirname,
});

const x402Mcp = wrapMCPClientWithPayment(mcpClient, paymentClient, {
  autoPayment: true,
  onPaymentRequested: async ({ paymentRequired }) => {
    const price = paymentRequired.accepts[0];
    console.log(`  (payment requested: ${price.amount} of ${price.asset} on ${price.network})`);
    return true;
  },
});

async function main() {
  await x402Mcp.connect(transport);

  const { tools } = await x402Mcp.listTools();
  console.log(
    "Available tools:",
    tools.map((t) => t.name)
  );

  console.log("\nCalling free tool (ping)...");
  const pingResult = await x402Mcp.callTool("ping", {});
  console.log("  ->", pingResult.content[0].text);

  console.log("\nCalling paid tool (get-fake-stock-quote, will auto-pay $0.01 USDC)...");
  try {
    const quoteResult = await x402Mcp.callTool("get-fake-stock-quote", { ticker: "ACME" });
    if (quoteResult.isError) {
      console.error("  -> tool returned an error:", quoteResult.content[0].text);
      process.exitCode = 1;
    } else {
      console.log("  ->", quoteResult.content[0].text);
      console.log("  paid:", quoteResult.paymentMade);
    }
  } catch (err) {
    // autoPayment still throws if the payment itself is rejected (e.g. an
    // unfunded wallet) — that's a payment failure, not a transport error.
    console.error("  -> payment was not accepted:", err.message);
    process.exitCode = 1;
  }

  await x402Mcp.close();
}

main().catch((err) => {
  console.error("Request failed:", err.message);
  process.exitCode = 1;
});
