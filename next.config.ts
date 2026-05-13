import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['viem', 'ox', '@aws-sdk/client-kms'],

  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  },

  webpack(config) {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;