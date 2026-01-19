import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DynamicProvider } from "@/lib/providers/DynamicProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ZillaScope - GUN Token & NFT Portfolio Tracker",
  description: "Track your GUN tokens and NFTs across GunzChain and Solana. Real-time blockchain portfolio tracking for the GUNZILLA community.",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/logo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <DynamicProvider>
          {children}
        </DynamicProvider>
      </body>
    </html>
  );
}
