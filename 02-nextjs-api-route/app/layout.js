export const metadata = {
  title: "x402 Next.js example",
  description: "A paywalled API route, gated by x402.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
