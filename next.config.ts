import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
  // Include dev.db in every serverless function bundle so SQLite works on Vercel
  outputFileTracingIncludes: {
    '/api/**/*': ['./dev.db'],
    '/credits': ['./dev.db'],
    '/feature-requests': ['./dev.db'],
  },
  images: {
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
