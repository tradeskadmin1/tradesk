function require(name: string): string {
    const value = process.env[name]
    if (!value) throw new Error(`[env] Missing required environment variable: ${name}`)
    return value
}

function optional(name: string): string | undefined {
    return process.env[name]
}


export const clientEnv = {
    supabaseUrl: () => require('NEXT_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: () => require('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    walletConnectProjectId: () => require('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID'),
    appUrl: () => optional('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000',
}


export const serverEnv = {
    supabaseServiceRoleKey: () => require('SUPABASE_SERVICE_ROLE_KEY'),
    awsRegion: () => require('AWS_REGION'),
    awsAccessKeyId: () => require('AWS_ACCESS_KEY_ID'),
    awsSecretKey: () => require('AWS_SECRET_ACCESS_KEY'),
    kmsKeyId: () => require('AWS_KMS_KEY_ID'),
    rpcEth: () => require('RPC_ETH_MAINNET'),
    rpcBsc: () => require('RPC_BSC'),
    rpcArbitrum: () => require('RPC_ARBITRUM'),
    zeroXApiKey: () => require('ZEROX_API_KEY'),
    etherscanApiKey: () => require('ETHERSCAN_API_KEY'),
    bscscanApiKey: () => require('BSCSCAN_API_KEY'),
    arbiscanApiKey: () => require('ARBISCAN_API_KEY'),
    platformMasterMnemonic: () => require('PLATFORM_MASTER_MNEMONIC'),
}