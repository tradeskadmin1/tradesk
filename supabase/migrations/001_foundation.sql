
CREATE TABLE IF NOT EXISTS public.users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT,
  full_name       TEXT,
  onboarded       BOOLEAN NOT NULL DEFAULT FALSE,
  kyc_status      TEXT    NOT NULL DEFAULT 'none'
                  CHECK (kyc_status IN ('none', 'pending', 'approved', 'rejected')),
  kyc_submitted_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users: read own row"   ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users: update own row" ON public.users FOR UPDATE USING (auth.uid() = id);



CREATE TABLE IF NOT EXISTS public.custodial_wallets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chain_id              INTEGER NOT NULL,  -- 1=ETH, 56=BSC, 42161=Arbitrum
  address               TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,     -- AES-256-GCM ciphertext, base64
  encrypted_dek         TEXT NOT NULL,     -- Data Encryption Key ciphertext from KMS
  derivation_path       TEXT NOT NULL,     -- BIP-44 path used to derive this key
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, chain_id)
);

ALTER TABLE public.custodial_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallets: read own"
  ON public.custodial_wallets FOR SELECT
  USING (auth.uid() = user_id);



CREATE TABLE IF NOT EXISTS public.wallet_balances (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id     UUID NOT NULL REFERENCES public.custodial_wallets(id) ON DELETE CASCADE,
  token_symbol  TEXT NOT NULL,
  token_address TEXT NOT NULL,
  chain_id      INTEGER NOT NULL,
  balance       NUMERIC(36, 18) NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (wallet_id, token_address, chain_id)
);

ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "balances: read own"
  ON public.wallet_balances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.custodial_wallets w
      WHERE w.id = wallet_id AND w.user_id = auth.uid()
    )
  );



CREATE TABLE IF NOT EXISTS public.orders (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id),
  chain_id           INTEGER NOT NULL,
  pair               TEXT NOT NULL,         -- e.g. 'ETH_USDC'
  base_token         TEXT NOT NULL,
  quote_token        TEXT NOT NULL,
  side               TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  order_type         TEXT NOT NULL CHECK (order_type IN ('market', 'limit')),
  amount             NUMERIC(36, 18) NOT NULL,
  price              NUMERIC(36, 18),        -- NULL for market orders
  filled_amount      NUMERIC(36, 18) NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'open', 'filled', 'cancelled', 'failed')),
  tx_hash            TEXT,
  dex_used           TEXT,                   -- aggregator/DEX that executed the trade
  gas_used           NUMERIC,
  slippage_tolerance NUMERIC(6, 4) NOT NULL DEFAULT 0.005,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS orders_status_idx  ON public.orders (status);

CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders: read own"   ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "orders: insert own" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);



CREATE TABLE IF NOT EXISTS public.deposits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  wallet_id     UUID NOT NULL REFERENCES public.custodial_wallets(id),
  chain_id      INTEGER NOT NULL,
  token_symbol  TEXT NOT NULL,
  token_address TEXT NOT NULL,
  amount        NUMERIC(36, 18) NOT NULL,
  tx_hash       TEXT NOT NULL UNIQUE,
  from_address  TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'confirmed',
  confirmed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS deposits_user_id_idx ON public.deposits (user_id);

ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deposits: read own" ON public.deposits FOR SELECT USING (auth.uid() = user_id);



CREATE TABLE IF NOT EXISTS public.withdrawals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  wallet_id     UUID NOT NULL REFERENCES public.custodial_wallets(id),
  chain_id      INTEGER NOT NULL,
  token_symbol  TEXT NOT NULL,
  token_address TEXT NOT NULL,
  amount        NUMERIC(36, 18) NOT NULL,
  fee           NUMERIC(36, 18),
  to_address    TEXT NOT NULL,
  tx_hash       TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS withdrawals_user_id_idx ON public.withdrawals (user_id);
CREATE INDEX IF NOT EXISTS withdrawals_status_idx  ON public.withdrawals (status);

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "withdrawals: read own"   ON public.withdrawals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "withdrawals: insert own" ON public.withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);



CREATE TABLE IF NOT EXISTS public.arbitrage_opportunities (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair                 TEXT NOT NULL,
  buy_dex              TEXT NOT NULL,
  sell_dex             TEXT NOT NULL,
  buy_chain_id         INTEGER NOT NULL,
  sell_chain_id        INTEGER NOT NULL,
  buy_price            NUMERIC(36, 18) NOT NULL,
  sell_price           NUMERIC(36, 18) NOT NULL,
  profit_pct           NUMERIC(10, 4)  NOT NULL,
  estimated_profit_usd NUMERIC(18, 2),
  estimated_gas_usd    NUMERIC(18, 2),
  net_profit_usd       NUMERIC(18, 2),
  risk_score           INTEGER NOT NULL CHECK (risk_score BETWEEN 1 AND 100),
  route_path           JSONB NOT NULL,
  expires_at           TIMESTAMPTZ NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS arb_pair_idx    ON public.arbitrage_opportunities (pair);
CREATE INDEX IF NOT EXISTS arb_expires_idx ON public.arbitrage_opportunities (expires_at);


ALTER TABLE public.arbitrage_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "arb: read all authenticated"
  ON public.arbitrage_opportunities FOR SELECT
  TO authenticated
  USING (expires_at > NOW());



CREATE TABLE IF NOT EXISTS public.kyc_submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  full_name    TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  nationality  TEXT NOT NULL,
  id_type      TEXT NOT NULL
               CHECK (id_type IN ('passport', 'national_id', 'drivers_license')),
  id_front_url TEXT NOT NULL,
  id_back_url  TEXT,
  selfie_url   TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at  TIMESTAMPTZ
);

ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kyc: read own"   ON public.kyc_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "kyc: insert own" ON public.kyc_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

