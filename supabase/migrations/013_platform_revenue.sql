CREATE TABLE IF NOT EXISTS public.platform_revenue (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    source         TEXT        NOT NULL,
    user_id        UUID        NOT NULL REFERENCES public.users (id) ON DELETE SET NULL,
    ref_id         TEXT,
    amount         NUMERIC(20, 6) NOT NULL CHECK (amount > 0),
    token_symbol   TEXT        NOT NULL DEFAULT 'USDC',
    chain_id       INTEGER     NOT NULL,
    note           TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS platform_revenue_created_at_idx ON public.platform_revenue (created_at DESC);
CREATE INDEX IF NOT EXISTS platform_revenue_source_idx     ON public.platform_revenue (source);
CREATE INDEX IF NOT EXISTS platform_revenue_user_id_idx    ON public.platform_revenue (user_id);


ALTER TABLE public.platform_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only" ON public.platform_revenue
    USING (false)
    WITH CHECK (false);

ALTER TABLE public.arbitrage_trades
    ADD COLUMN IF NOT EXISTS platform_fee_usd NUMERIC(20, 6) NOT NULL DEFAULT 0;
