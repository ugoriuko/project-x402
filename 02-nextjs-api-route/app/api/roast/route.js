import { NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { resourceServer, payToAddress } from "../../../lib/x402Server.js";

// Canned lines, not a real linter or an LLM call — the point of this route
// is demonstrating the payment gate, not the roast quality.
const ROASTS = [
  "This function does five things and none of them are its name.",
  "I've seen more consistent indentation in a ransom note.",
  "There's a comment here that's older than some of your dependencies.",
  "This variable is named 'data'. Bold. Committal. Wrong.",
  "You've reinvented a standard library function, slightly worse.",
  "This try/catch block catches everything and learns nothing.",
];

async function handler(request) {
  const body = await request.json().catch(() => ({}));
  const snippet = typeof body.snippet === "string" ? body.snippet.trim() : "";

  const roast = ROASTS[Math.floor(Math.random() * ROASTS.length)];
  const lineCount = snippet ? snippet.split("\n").length : 0;

  return NextResponse.json({
    roast,
    snippetLines: lineCount,
    paid: true,
  });
}

export const POST = withX402(
  handler,
  {
    accepts: {
      scheme: "exact",
      price: "$0.01",
      network: "eip155:84532",
      payTo: payToAddress,
    },
    description: "Roast one code snippet. Not therapy.",
    mimeType: "application/json",
  },
  resourceServer
);
