import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // viewTransition disabled — conflicts with <Suspense> hydration in client components
    // (causes "server rendered HTML didn't match" errors). Custom vt-enter/vt-exit
    // keyframes in globals.css still work independently via the View Transition API.
    optimizePackageImports: [
      '@visx/axis',
      '@visx/curve',
      '@visx/event',
      '@visx/gradient',
      '@visx/grid',
      '@visx/group',
      '@visx/pattern',
      '@visx/responsive',
      '@visx/scale',
      '@visx/shape',
      '@visx/text',
      '@visx/threshold',
      '@visx/tooltip',
      '@visx/zoom',
      'ethers',
      'posthog-js',
    ],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdne-g01-livepc-wu-itemsthumbnails.azureedge.net',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.io',
      },
      {
        protocol: 'https',
        hostname: '**.ipfs.io',
      },
      {
        protocol: 'https',
        hostname: 'i2c.seadn.io',
      },
    ],
  },
};

export default nextConfig;
