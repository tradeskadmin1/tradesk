import { mnemonicToSeedSync } from '@scure/bip39'
import { HDKey } from '@scure/bip32'
import { privateKeyToAccount } from 'viem/accounts'
import { encryptPrivateKey, decryptPrivateKey } from './kms'
import { createSupabaseAdminClient as _createSupabaseAdminClient } from './supabase-server'

const createSupabaseAdminClient = (): any => _createSupabaseAdminClient()
import { SUPPORTED_CHAIN_IDS, type SupportedChainId } from '@/config/chains'
import type { Database } from './database.types'

type WalletRow = Database['public']['Tables']['custodial_wallets']['Row']
type WalletInsert = Database['public']['Tables']['custodial_wallets']['Insert']

const COIN_TYPE: Record<SupportedChainId, number> = {
    1: 60,
    56: 60,
    42161: 60,
}

function derivationPath(chainId: SupportedChainId, accountIndex: number): string {
    return `m/44'/${COIN_TYPE[chainId]}'/0'/0/${accountIndex}`
}


function derivePrivateKey(
    mnemonic: string,
    chainId: SupportedChainId,
    accountIndex: number,
): { privateKey: string; path: string } {
    const seed = mnemonicToSeedSync(mnemonic)
    const root = HDKey.fromMasterSeed(seed)
    const path = derivationPath(chainId, accountIndex)
    const child = root.derive(path)

    if (!child.privateKey) throw new Error(`[wallet] Failed to derive key at ${path}`)

    const privateKey = `0x${Buffer.from(child.privateKey).toString('hex')}`

    seed.fill(0)

    return { privateKey, path }
}


async function getNextAccountIndex(): Promise<number> {
    const supabase = createSupabaseAdminClient()
    const { count, error } = await supabase
        .from('custodial_wallets')
        .select('*', { count: 'exact', head: true })

    if (error) throw new Error(`[wallet] Failed to get account index: ${error.message}`)
    return count ?? 0
}



export interface WalletRecord {
    id: string
    chainId: SupportedChainId
    address: string
}


export async function createWalletsForUser(userId: string): Promise<WalletRecord[]> {
    const mnemonic = process.env.PLATFORM_MASTER_MNEMONIC
    if (!mnemonic) throw new Error('[wallet] Missing PLATFORM_MASTER_MNEMONIC')

    const supabase = createSupabaseAdminClient()
    const accountIndex = await getNextAccountIndex()
    const records: WalletRecord[] = []

    for (const chainId of SUPPORTED_CHAIN_IDS) {
        const { data: existing } = await supabase
            .from('custodial_wallets')
            .select('id, address')
            .eq('user_id', userId)
            .eq('chain_id', chainId)
            .single()

        if (existing) {
            records.push({ id: existing.id, chainId, address: existing.address })
            continue
        }

        const { privateKey, path } = derivePrivateKey(mnemonic, chainId, accountIndex)
        const account = privateKeyToAccount(privateKey as `0x${string}`)
        const address = account.address.toLowerCase()  // store lowercase for consistent webhook lookups
        const { encryptedPrivateKey, encryptedDek } = await encryptPrivateKey(privateKey)
        const { data: inserted, error } = await supabase
            .from('custodial_wallets')
            .insert({
                user_id: userId,
                chain_id: chainId,
                address,
                encrypted_private_key: encryptedPrivateKey,
                encrypted_dek: encryptedDek,
                derivation_path: path,
            })
            .select('id')
            .single()

        if (error || !inserted) {
            throw new Error(`[wallet] Failed to store wallet: ${error?.message}`)
        }

        records.push({ id: inserted.id, chainId, address })
    }

    return records
}


export async function getUserWalletAddress(
    userId: string,
    chainId: SupportedChainId,
): Promise<string | null> {
    const supabase = createSupabaseAdminClient()
    const { data } = await supabase
        .from('custodial_wallets')
        .select('address')
        .eq('user_id', userId)
        .eq('chain_id', chainId)
        .single()

    return data?.address ?? null
}


export async function getUserWallets(userId: string): Promise<WalletRecord[]> {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
        .from('custodial_wallets')
        .select('id, chain_id, address')
        .eq('user_id', userId)

    if (error) throw new Error(`[wallet] Failed to fetch wallets: ${error.message}`)

    return (data ?? []).map((w: WalletRow) => ({
        id: w.id,
        chainId: w.chain_id as SupportedChainId,
        address: w.address,
    }))
}


export async function loadPrivateKey(
    userId: string,
    chainId: SupportedChainId,
): Promise<string> {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
        .from('custodial_wallets')
        .select('encrypted_private_key, encrypted_dek')
        .eq('user_id', userId)
        .eq('chain_id', chainId)
        .single()

    if (error || !data) {
        throw new Error(`[wallet] Wallet not found for user ${userId} on chain ${chainId}`)
    }

    return decryptPrivateKey(data.encrypted_private_key, data.encrypted_dek)
}