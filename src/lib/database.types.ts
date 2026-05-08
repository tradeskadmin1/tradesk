/**
 * Supabase database types.
 * Regenerate with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string
                    email: string | null
                    full_name: string | null
                    onboarded: boolean
                    kyc_status: 'none' | 'pending' | 'approved' | 'rejected'
                    kyc_submitted_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email?: string | null
                    full_name?: string | null
                    onboarded?: boolean
                    kyc_status?: 'none' | 'pending' | 'approved' | 'rejected'
                    kyc_submitted_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    email?: string | null
                    full_name?: string | null
                    onboarded?: boolean
                    kyc_status?: 'none' | 'pending' | 'approved' | 'rejected'
                    kyc_submitted_at?: string | null
                    updated_at?: string
                }
            }
            custodial_wallets: {
                Row: {
                    id: string
                    user_id: string
                    chain_id: number
                    address: string
                    encrypted_private_key: string
                    encrypted_dek: string
                    derivation_path: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    chain_id: number
                    address: string
                    encrypted_private_key: string
                    encrypted_dek: string
                    derivation_path: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    chain_id?: number
                    address?: string
                    encrypted_private_key?: string
                    encrypted_dek?: string
                    derivation_path?: string
                    created_at?: string
                }
            }
            wallet_balances: {
                Row: {
                    id: string
                    wallet_id: string
                    token_symbol: string
                    token_address: string
                    chain_id: number
                    balance: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    wallet_id: string
                    token_symbol: string
                    token_address: string
                    chain_id: number
                    balance?: string
                    updated_at?: string
                }
                Update: {
                    balance?: string
                    updated_at?: string
                }
            }
            orders: {
                Row: {
                    id: string
                    user_id: string
                    chain_id: number
                    pair: string
                    base_token: string
                    quote_token: string
                    side: 'buy' | 'sell'
                    order_type: 'market' | 'limit'
                    amount: string
                    price: string | null
                    filled_amount: string
                    status: 'pending' | 'open' | 'filled' | 'cancelled' | 'failed'
                    tx_hash: string | null
                    dex_used: string | null
                    gas_used: string | null
                    slippage_tolerance: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    chain_id: number
                    pair: string
                    base_token: string
                    quote_token: string
                    side: 'buy' | 'sell'
                    order_type: 'market' | 'limit'
                    amount: string
                    price?: string | null
                    filled_amount?: string
                    status?: 'pending' | 'open' | 'filled' | 'cancelled' | 'failed'
                    tx_hash?: string | null
                    dex_used?: string | null
                    gas_used?: string | null
                    slippage_tolerance?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    filled_amount?: string
                    status?: 'pending' | 'open' | 'filled' | 'cancelled' | 'failed'
                    tx_hash?: string | null
                    dex_used?: string | null
                    gas_used?: string | null
                    updated_at?: string
                }
            }
            deposits: {
                Row: {
                    id: string
                    user_id: string
                    wallet_id: string
                    chain_id: number
                    token_symbol: string
                    token_address: string
                    amount: string
                    tx_hash: string
                    from_address: string
                    status: string
                    confirmed_at: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    wallet_id: string
                    chain_id: number
                    token_symbol: string
                    token_address: string
                    amount: string
                    tx_hash: string
                    from_address: string
                    status?: string
                    confirmed_at?: string
                    created_at?: string
                }
                Update: {
                    status?: string
                }
            }
            withdrawals: {
                Row: {
                    id: string
                    user_id: string
                    wallet_id: string
                    chain_id: number
                    token_symbol: string
                    token_address: string
                    amount: string
                    fee: string | null
                    to_address: string
                    tx_hash: string | null
                    status: 'pending' | 'processing' | 'completed' | 'failed'
                    created_at: string
                    completed_at: string | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    wallet_id: string
                    chain_id: number
                    token_symbol: string
                    token_address: string
                    amount: string
                    fee?: string | null
                    to_address: string
                    tx_hash?: string | null
                    status?: 'pending' | 'processing' | 'completed' | 'failed'
                    created_at?: string
                    completed_at?: string | null
                }
                Update: {
                    fee?: string | null
                    tx_hash?: string | null
                    status?: 'pending' | 'processing' | 'completed' | 'failed'
                    completed_at?: string | null
                }
            }
            arbitrage_opportunities: {
                Row: {
                    id: string
                    pair: string
                    buy_dex: string
                    sell_dex: string
                    buy_chain_id: number
                    sell_chain_id: number
                    buy_price: string
                    sell_price: string
                    profit_pct: string
                    estimated_profit_usd: string | null
                    estimated_gas_usd: string | null
                    net_profit_usd: string | null
                    risk_score: number
                    route_path: Json
                    expires_at: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    pair: string
                    buy_dex: string
                    sell_dex: string
                    buy_chain_id: number
                    sell_chain_id: number
                    buy_price: string
                    sell_price: string
                    profit_pct: string
                    estimated_profit_usd?: string | null
                    estimated_gas_usd?: string | null
                    net_profit_usd?: string | null
                    risk_score: number
                    route_path: Json
                    expires_at: string
                    created_at?: string
                }
                Update: {
                    pair?: string
                    buy_dex?: string
                    sell_dex?: string
                    buy_chain_id?: number
                    sell_chain_id?: number
                    buy_price?: string
                    sell_price?: string
                    profit_pct?: string
                    estimated_profit_usd?: string | null
                    estimated_gas_usd?: string | null
                    net_profit_usd?: string | null
                    risk_score?: number
                    route_path?: Json
                    expires_at?: string
                }
            }
            kyc_submissions: {
                Row: {
                    id: string
                    user_id: string
                    full_name: string
                    date_of_birth: string
                    nationality: string
                    id_type: 'passport' | 'national_id' | 'drivers_license'
                    id_front_url: string
                    id_back_url: string | null
                    selfie_url: string | null
                    status: 'pending' | 'approved' | 'rejected'
                    submitted_at: string
                    reviewed_at: string | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    full_name: string
                    date_of_birth: string
                    nationality: string
                    id_type: 'passport' | 'national_id' | 'drivers_license'
                    id_front_url: string
                    id_back_url?: string | null
                    selfie_url?: string | null
                    status?: 'pending' | 'approved' | 'rejected'
                    submitted_at?: string
                    reviewed_at?: string | null
                }
                Update: {
                    status?: 'pending' | 'approved' | 'rejected'
                    reviewed_at?: string | null
                }
            }
        }
        Views: Record<string, never>
        Functions: Record<string, never>
        Enums: Record<string, never>
    }
}