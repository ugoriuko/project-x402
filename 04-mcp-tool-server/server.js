import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { x402ResourceServer } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { createPaymentWrapper, createToolResourceUrl } from "@x402/mcp";
import "dotenv/config";

const payTo = process.env.PAY_TO_ADDRESS;
if (!payTo) {
  console.error("Set PAY_TO_ADDRESS in .env (the wallet that should receive payments).");
  process.exit(1);
}

const facilitatorUrl = process.env.FACILITATOR_URL || "https://x402.org/facilitator";
const facilitator = new HTTPFacilitatorClient({ url: facilitatorUrl });

// Same network as project 01 — Base Sepolia. The point of this project is
// the MCP + x402 combination, not a third look at EVM vs Solana.
const resourceServer = new x402ResourceServer(facilitator).register(
  "eip155:84532",
  new ExactEvmScheme()
);

const server = new McpServer({ name: "x402-mcp-tool-server", version: "1.0.0" });

// Free tool, for comparison — no payment required.
server.registerTool(
  "ping",
  {
    title: "Ping",
    description: "Health check. Free, no payment required.",
    inputSchema: {},
  },
  async () => ({
    content: [{ type: "text", text: JSON.stringify({ status: "ok" }) }],
  })
);

// Paid tool. accepts must be built before the tool is registered — the
// wrapper needs a concrete PaymentRequirements array, not a promise, at
// registration time. initialize() syncs supported schemes/kinds from the
// facilitator; paymentMiddleware (used in the other three projects) does
// this internally on first request, but calling buildPaymentRequirements
// directly — the documented @x402/mcp pattern — needs it done explicitly
// first, or it fails with "Facilitator does not support exact on ...".
await resourceServer.initialize();

const accepts = await resourceServer.buildPaymentRequirements({
  scheme: "exact",
  network: "eip155:84532",
  payTo,
  price: "$0.01",
});

// The wrapper is built before server.registerTool() assigns the tool its
// name below, so it can't infer the resource URL on its own — without this,
// it defaults to the generic "mcp://tool/paid_tool" placeholder.
const paid = createPaymentWrapper(resourceServer, {
  accepts,
  resource: {
    url: createToolResourceUrl("get-fake-stock-quote"),
    description: "One fake stock quote for a given ticker, priced per call.",
    mimeType: "application/json",
  },
});

server.registerTool(
  "get-fake-stock-quote",
  {
    title: "Get fake stock quote",
    description:
      "Returns a fake stock quote for a ticker symbol. Not real market data — " +
      "the point of this tool is demonstrating the MCP + x402 payment gate, " +
      "not the data. $0.01 USDC per call, Base Sepolia testnet.",
    inputSchema: {
      ticker: z.string().min(1).max(10).describe("Ticker symbol, e.g. ACME"),
    },
  },
  paid(async ({ ticker }) => {
    const price = (Math.random() * 500 + 10).toFixed(2);
    const changePercent = (Math.random() * 10 - 5).toFixed(2);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            ticker: ticker.toUpperCase(),
            price: Number(price),
            changePercent: Number(changePercent),
            fake: true,
          }),
        },
      ],
    };
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);

// stdout is the MCP transport itself — never console.log there. All status
// output goes to stderr, same as any well-behaved stdio MCP server.
console.error("x402 MCP tool server running on stdio.");
console.error("  Free tool: ping");
console.error("  Paid tool: get-fake-stock-quote ($0.01 USDC, Base Sepolia)");
