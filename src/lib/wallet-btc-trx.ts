/**
 * BTC and TRX address derivation
 *
 * Uses libraries already installed as transitive dependencies:
 *   @scure/bip32     — HD key derivation
 *   @scure/bip39     — mnemonic → seed
 *   @noble/curves    — secp256k1 public key
 *   @noble/hashes    — SHA256, RIPEMD160, Keccak256
 *   @scure/base      — bech32 (BTC) and base58 (TRX)
 *
 * BTC chain_id stored as: 0
 * TRX chain_id stored as: 728126428  (Tron mainnet)
 */

import { mnemonicToSeedSync } from '@scure/bip39'
import { HDKey } from '@scure/bip32'
import { secp256k1 } from '@noble/curves/secp256k1'
import { sha256 } from '@noble/hashes/sha256'
import { ripemd160 } from '@noble/hashes/ripemd160'
import { keccak_256 } from '@noble/hashes/sha3'
import { bech32, base58 } from '@scure/base'
import { createSupabaseAdminClient as _createSupabaseAdminClient } from './supabase-server'

const createSupabaseAdminClient = (): any => _createSupabaseAdminClient()

export const BTC_CHAIN_ID = 0
export const TRX_CHAIN_ID = 728_126_428

// ─── BTC ─────────────────────────────────────────────────────────────────────

function deriveBtcPrivKey(mnemonic: string, accountIndex: number): Uint8Array {
    const seed = mnemonicToSeedSync(mnemonic)
    const root = HDKey.fromMasterSeed(seed)
    // BIP-84: native segwit (P2WPKH) derivation path
    const child = root.derive(`m/84'/0'/0'/0/${accountIndex}`)
    seed.fill(0)
    if (!child.privateKey) throw new Error('[wallet-btc] Failed to derive BTC key')
    return child.privateKey
}

function btcP2WPKHAddress(privKey: Uint8Array): string {
    // Compressed public key (33 bytes)
    const pubKey = secp256k1.getPublicKey(privKey, true)
    // hash160 = RIPEMD160(SHA256(pubkey))
    const hash160 = ripemd160(sha256(pubKey))
    // Bech32-encode: witness version 0 + hash160 as 5-bit words
    const words = bech32.toWords(hash160)
    return bech32.encode('bc', Uint8Array.from([0, ...words]))
}

// ─── TRX ─────────────────────────────────────────────────────────────────────

function deriveTrxPrivKey(mnemonic: string, accountIndex: number): Uint8Array {
    const seed = mnemonicToSeedSync(mnemonic)
    const root = HDKey.fromMasterSeed(seed)
    // BIP-44 coin type 195 = Tron
    const child = root.derive(`m/44'/195'/0'/0/${accountIndex}`)
    seed.fill(0)
    if (!child.privateKey) throw new Error('[wallet-trx] Failed to derive TRX key')
    return child.privateKey
}

function trxAddress(privKey: Uint8Array): string {
    // Uncompressed public key (65 bytes, starts with 0x04)
    const pubUncompressed = secp256k1.getPublicKey(privKey, false)
    // Drop the 0x04 prefix → 64 bytes
    const pub64 = pubUncompressed.slice(1)
    // Keccak256, take last 20 bytes
    const hash = keccak_256(pub64)
    const addr20 = hash.slice(12)
    // Prepend Tron mainnet prefix 0x41
    const payload = new Uint8Array(21)
    payload[0] = 0x41
    payload.set(addr20, 1)
    // 4-byte checksum = first 4 bytes of SHA256(SHA256(payload))
    const checksum = sha256(sha256(payload)).slice(0, 4)
    // Final = payload (21) + checksum (4) = 25 bytes → base58
    const full = new Uint8Array(25)
    full.set(payload)
    full.set(checksum, 21)
    return base58.encode(full)
}

// ─── Account index lookup ─────────────────────────────────────────────────────

/**
 * Returns the account index from the user's existing ETH wallet derivation path.
 * e.g. "m/44'/60'/0'/0/7" → 7
 */
async function getUserAccountIndex(userId: string): Promise<number> {
    const supabase = createSupabaseAdminClient()
    const { data } = await supabase
        .from('custodial_wallets')
        .select('derivation_path')
        .eq('user_id', userId)
        .eq('chain_id', 1) // Ethereum mainnet
        .single()

    if (!data?.derivation_path) {
        throw new Error('[wallet-btc-trx] No ETH wallet found — user must complete onboarding first')
    }

    const parts = (data.derivation_path as string).split('/')
    return parseInt(parts[parts.length - 1], 10)
}

// ─── Public helpers ───────────────────────────────────────────────────────────

export async function getOrCreateBtcWallet(userId: string): Promise<string> {
    const supabase = createSupabaseAdminClient()

    // Return existing if already created
    const { data: existing } = await supabase
        .from('custodial_wallets')
        .select('address')
        .eq('user_id', userId)
        .eq('chain_id', BTC_CHAIN_ID)
        .single()

    if (existing?.address) return existing.address

    const mnemonic = process.env.PLATFORM_MASTER_MNEMONIC
    if (!mnemonic) throw new Error('[wallet-btc] Missing PLATFORM_MASTER_MNEMONIC')

    const accountIndex = await getUserAccountIndex(userId)
    const privKey = deriveBtcPrivKey(mnemonic, accountIndex)
    const address = btcP2WPKHAddress(privKey)
    privKey.fill(0)

    await supabase.from('custodial_wallets').insert({
        user_id: userId,
        chain_id: BTC_CHAIN_ID,
        address,
        derivation_path: `m/84'/0'/0'/0/${accountIndex}`,
        encrypted_private_key: 'external-custody',
        encrypted_dek: 'external-custody',
    })

    return address
}

export async function getOrCreateTrxWallet(userId: string): Promise<string> {
    const supabase = createSupabaseAdminClient()

    const { data: existing } = await supabase
        .from('custodial_wallets')
        .select('address')
        .eq('user_id', userId)
        .eq('chain_id', TRX_CHAIN_ID)
        .single()

    if (existing?.address) return existing.address

    const mnemonic = process.env.PLATFORM_MASTER_MNEMONIC
    if (!mnemonic) throw new Error('[wallet-trx] Missing PLATFORM_MASTER_MNEMONIC')

    const accountIndex = await getUserAccountIndex(userId)
    const privKey = deriveTrxPrivKey(mnemonic, accountIndex)
    const address = trxAddress(privKey)
    privKey.fill(0)

    await supabase.from('custodial_wallets').insert({
        user_id: userId,
        chain_id: TRX_CHAIN_ID,
        address,
        derivation_path: `m/44'/195'/0'/0/${accountIndex}`,
        encrypted_private_key: 'external-custody',
        encrypted_dek: 'external-custody',
    })

    return address
}
