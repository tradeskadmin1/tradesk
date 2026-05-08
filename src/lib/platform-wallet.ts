import { mnemonicToSeedSync } from '@scure/bip39'
import { HDKey } from '@scure/bip32'
import { privateKeyToAccount } from 'viem/accounts'
import { createWalletClient, createPublicClient, http } from 'viem'
import { encryptPrivateKey, decryptPrivateKey } from './kms'
import { createSupabaseAdminClient as _createSupabaseAdminClient } from './supabase-server'
import { SUPPORTED_CHAIN_IDS, CHAIN_CONFIG, type SupportedChainId } from '@/config/chains'

const createSupabaseAdminClient = (): any => _createSupabaseAdminClient()


const PLATFORM_ACCOUNT = 100
const CHAIN_INDEX: Record<SupportedChainId, number> = { 1: 0, 56: 1, 42161: 2 }

function platformPath(chainId: SupportedChainId): string {
    return `m/44'/60'/${PLATFORM_ACCOUNT}'/0/${CHAIN_INDEX[chainId]}`
}

function derivePlatformKey(mnemonic: string, chainId: SupportedChainId) {
    const seed = mnemonicToSeedSync(mnemonic)
    const root = HDKey.fromMasterSeed(seed)
    const path = platformPath(chainId)
    const child = root.derive(path)

    if (!child.privateKey) throw new Error(`[platform-wallet] Failed to derive key at ${path}`)
    const privateKey = `0x${Buffer.from(child.privateKey).toString('hex')}` as `0x${string}`
    seed.fill(0)
    return { privateKey, path }
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PlatformWallet {
    id: string
    chainId: SupportedChainId
    address: string
    label: string
}


export async function initializePlatformWallets(): Promise<PlatformWallet[]> {
    const mnemonic = process.env.PLATFORM_MASTER_MNEMONIC
    if (!mnemonic) throw new Error('[platform-wallet] Missing PLATFORM_MASTER_MNEMONIC')

    const supabase = createSupabaseAdminClient()
    const results: PlatformWallet[] = []

    for (const chainId of SUPPORTED_CHAIN_IDS) {
        const { data: existing } = await supabase
            .from('platform_wallets')
            .select('id, chain_id, address, label')
            .eq('chain_id', chainId)
            .maybeSingle()

        if (existing) {
            results.push({
                id: existing.id,
                chainId: existing.chain_id as SupportedChainId,
                address: existing.address,
                label: existing.label,
            })
            continue
        }

        const { privateKey, path } = derivePlatformKey(mnemonic, chainId)
        const account = privateKeyToAccount(privateKey)
        const { encryptedPrivateKey, encryptedDek } = await encryptPrivateKey(privateKey)

        const { data: inserted, error } = await supabase
            .from('platform_wallets')
            .insert({
                chain_id: chainId,
                address: account.address.toLowerCase(),
                encrypted_private_key: encryptedPrivateKey,
                encrypted_dek: encryptedDek,
                derivation_path: path,
                label: 'hot',
            })
            .select('id, chain_id, address, label')
            .single()

        if (error || !inserted) {
            throw new Error(`[platform-wallet] Failed to store wallet for chain ${chainId}: ${error?.message}`)
        }

        console.log(`[platform-wallet] Created hot wallet for chain ${chainId}: ${account.address}`)

        results.push({
            id: inserted.id,
            chainId: inserted.chain_id as SupportedChainId,
            address: inserted.address,
            label: inserted.label,
        })
    }

    return results
}


export async function getPlatformWallet(chainId: SupportedChainId): Promise<PlatformWallet> {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
        .from('platform_wallets')
        .select('id, chain_id, address, label')
        .eq('chain_id', chainId)
        .eq('label', 'hot')
        .single()

    if (error || !data) {
        throw new Error(
            `[platform-wallet] Hot wallet not found for chain ${chainId}. ` +
            `Run POST /api/admin/init-platform-wallets first.`
        )
    }

    return {
        id: data.id,
        chainId: data.chain_id as SupportedChainId,
        address: data.address,
        label: data.label,
    }
}

export async function getPlatformAddress(chainId: SupportedChainId): Promise<string> {
    const wallet = await getPlatformWallet(chainId)
    return wallet.address
}


export async function getPlatformWalletClient(chainId: SupportedChainId) {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
        .from('platform_wallets')
        .select('encrypted_private_key, encrypted_dek')
        .eq('chain_id', chainId)
        .eq('label', 'hot')
        .single()

    if (error || !data) {
        throw new Error(`[platform-wallet] Hot wallet not found for chain ${chainId}`)
    }

    const privateKey = await decryptPrivateKey(
        data.encrypted_private_key,
        data.encrypted_dek,
    )

    const cfg = CHAIN_CONFIG[chainId]
    const rpcUrl = process.env[cfg.rpcEnvKey] ?? cfg.publicRpcFallback
    const account = privateKeyToAccount(privateKey as `0x${string}`)

    const walletClient = createWalletClient({
        account,
        chain: cfg.chain,
        transport: http(rpcUrl),
    })

    const publicClient = createPublicClient({
        chain: cfg.chain,
        transport: http(rpcUrl),
    })

    return { walletClient, publicClient, account, address: account.address }
}
