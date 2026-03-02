import type { Metadata } from "next";
import "./globals.css";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "AEEIA - Tokenized Outcomes & AI-Fetched Sources",
  description:
    "Tokenized outcomes on prediction markets resolved by processing outcomes with AI. Powered by Chainlink Runtime Environment.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Footer />
      </body>
    </html>
  );
}
