import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
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
