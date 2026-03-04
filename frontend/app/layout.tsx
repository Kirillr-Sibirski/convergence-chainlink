import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/layout/Footer";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const headingFont = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Aletheia - Permissionless AI-Resolved Prediction Markets",
  description:
    "Permissionless binary prediction markets with CRE-based AI consensus resolution and sybil-resistant market creation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${headingFont.variable} antialiased`}>
        {children}
        <Footer />
      </body>
    </html>
  );
}
