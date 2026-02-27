import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { Chakra_Petch, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { DynamicProvider } from "@/lib/providers/DynamicProvider";
import { PostHogProvider } from "@/lib/providers/PostHogProvider";
import { Toaster } from "sonner";

const CrosshairCursor = dynamic(() => import("@/components/CrosshairCursor"));
const OnboardingChecklist = dynamic(() => import("@/components/OnboardingChecklist"));
const UXRWelcomePopup = dynamic(() => import("@/components/UXRWelcomePopup"));

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

const toasterStyle = {
  background: 'var(--gs-dark-2)',
  color: 'var(--gs-white)',
  border: '1px solid rgba(255,255,255,0.06)',
  fontFamily: 'var(--font-body)',
} as const;

const toasterClassNames = {
  success: 'text-[var(--gs-profit)]',
  error: 'text-[var(--gs-loss)]',
} as const;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0A0A0A',
};

export const metadata: Metadata = {
  title: {
    default: 'GUNZscope - GUN Token & NFT Portfolio Tracker',
    template: '%s | GUNZscope',
  },
  description: 'Track your GUN tokens and NFTs across GunzChain and Solana. Real-time blockchain portfolio tracking for the GUNZILLA gaming ecosystem.',
  metadataBase: new URL('https://gunzscope.xyz'),
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: '/gs-icon.svg',
  },
  openGraph: {
    type: 'website',
    siteName: 'GUNZscope',
    title: 'GUNZscope - GUN Token & NFT Portfolio Tracker',
    description: 'Track your GUN tokens and NFTs across GunzChain and Solana. Real-time portfolio tracking for Off The Grid.',
    url: 'https://gunzscope.xyz',
  },
  twitter: {
    card: 'summary',
    title: 'GUNZscope - GUN Token & NFT Portfolio Tracker',
    description: 'Track your GUN tokens and NFTs across GunzChain and Solana.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${chakraPetch.variable} ${outfit.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'GUNZscope',
              url: 'https://gunzscope.xyz',
              description: 'Multi-chain portfolio tracker for GUN tokens and NFTs across GunzChain and Solana.',
              applicationCategory: 'FinanceApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
              creator: {
                '@type': 'Organization',
                name: 'GUNZscope',
                url: 'https://gunzscope.xyz',
              },
            }),
          }}
        />
      </head>
      <body className="antialiased font-body bg-gunzscope">
        <CrosshairCursor />
        <PostHogProvider>
        <DynamicProvider>
          <div id="app-content" className="relative z-10">
            {children}
          </div>
          <UXRWelcomePopup />
          <OnboardingChecklist />
          <Toaster
            position="top-right"
            toastOptions={{ style: toasterStyle, classNames: toasterClassNames }}
          />
        </DynamicProvider>
        </PostHogProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
