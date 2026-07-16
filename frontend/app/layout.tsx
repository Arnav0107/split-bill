import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "SplitBill",
  description: "On-chain expense splitter",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

//Nested one level inside WagmiProvider — passes our single queryClient instance down, then renders children (the actual app content) inside both providers. Nesting order here (WagmiProvider outside, QueryClientProvider inside) matters because wagmi's hooks need both contexts available, and this is the order the wagmi docs specify.
