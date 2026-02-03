import type { Metadata } from "next";
import { Chakra_Petch, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { DynamicProvider } from "@/lib/providers/DynamicProvider";
import CrosshairCursor from "@/components/CrosshairCursor";

// GUNZscope Brand Fonts
const chakraPetch = Chakra_Petch({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GUNZScope - GUN Token & NFT Portfolio Tracker",
  description: "Track your GUN tokens and NFTs across GunzChain and Solana. Real-time blockchain portfolio tracking for the GUNZILLA community.",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/gs-icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${chakraPetch.variable} ${outfit.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased font-body bg-gunzscope">
        <DynamicProvider>
          <CrosshairCursor />
          <div className="relative z-10">
            {children}
          </div>
        </DynamicProvider>
      </body>
    </html>
  );
}
