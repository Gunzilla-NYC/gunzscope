import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
