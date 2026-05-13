CREATE TABLE IF NOT EXISTS public.arbitrage_trades (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    opportunity_id       UUID REFERENCES public.arbitrage_opportunities(id) ON DELETE SET NULL,
    pair                 TEXT NOT NULL,
    buy_dex              TEXT NOT NULL,
    sell_dex             TEXT NOT NULL,
    buy_chain_id         INTEGER NOT NULL,
    sell_chain_id        INTEGER NOT NULL,
    buy_price            NUMERIC(36, 8) NOT NULL,
    sell_price           NUMERIC(36, 8) NOT NULL,
    trade_amount_usd     NUMERIC(18, 2) NOT NULL,
    gross_profit_usd     NUMERIC(18, 2) NOT NULL,
    gas_cost_usd         NUMERIC(18, 2) NOT NULL,
    net_profit_usd       NUMERIC(18, 2) NOT NULL,
    status               TEXT NOT NULL DEFAULT 'completed'
                             CHECK (status IN ('completed', 'failed')),
    executed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS arb_trades_user_idx ON public.arbitrage_trades (user_id, executed_at DESC);

ALTER TABLE public.arbitrage_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "arb_trades: read own"
    ON public.arbitrage_trades FOR SELECT
    USING (auth.uid() = user_id);
