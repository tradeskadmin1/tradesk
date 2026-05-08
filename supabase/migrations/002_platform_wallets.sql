CREATE TABLE IF NOT EXISTS public.platform_wallets (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id              INTEGER     NOT NULL UNIQUE,
  address               TEXT        NOT NULL,
  encrypted_private_key TEXT        NOT NULL,
  encrypted_dek         TEXT        NOT NULL,
  derivation_path       TEXT        NOT NULL,
  label                 TEXT        NOT NULL DEFAULT 'hot',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.platform_wallets ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
