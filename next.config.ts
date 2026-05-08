import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next.js from bundling these packages server-side — let Node.js
  // require them natively. Fixes the viem/ox "critical dependency" webpack
  // warning caused by dynamic requires inside viem's chain definitions.
  serverExternalPackages: ['viem', 'ox', '@aws-sdk/client-kms'],

  serverRuntimeConfig: {
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY,
    awsKmsKeyId: process.env.AWS_KMS_KEY_ID,
    platformMasterMnemonic: process.env.PLATFORM_MASTER_MNEMONIC,
    rpcEth: process.env.RPC_ETH_MAINNET,
    rpcBsc: process.env.RPC_BSC,
    rpcArbitrum: process.env.RPC_ARBITRUM,
    oneInchApiKey: process.env.ONEINCH_API_KEY,
    zeroXApiKey: process.env.ZEROX_API_KEY,
    coinGeckoApiKey: process.env.COINGECKO_API_KEY,
    etherscanApiKey: process.env.ETHERSCAN_API_KEY,
    bscscanApiKey: process.env.BSCSCAN_API_KEY,
    arbiscanApiKey: process.env.ARBISCAN_API_KEY,
  },

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