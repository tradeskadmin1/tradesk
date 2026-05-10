CREATE TABLE IF NOT EXISTS public.futures_positions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chain_id              INTEGER     NOT NULL,
  pair                  TEXT        NOT NULL,
  side                  TEXT        NOT NULL CHECK (side IN ('long', 'short')),
  size_usd              NUMERIC(36,8) NOT NULL,
  collateral_usd        NUMERIC(36,8) NOT NULL,
  collateral_token      TEXT        NOT NULL,
  leverage              NUMERIC(8,2) NOT NULL,
  entry_price           NUMERIC(36,8) NOT NULL,
  mark_price            NUMERIC(36,8),
  liquidation_price     NUMERIC(36,8),
  unrealised_pnl        NUMERIC(36,8) DEFAULT 0,
  status                TEXT        NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open', 'closed', 'liquidated')),
  gmx_position_key      TEXT,
  gmx_market_address    TEXT,
  collateral_address    TEXT,
  open_tx_hash          TEXT,
  close_tx_hash         TEXT,
  realised_pnl          NUMERIC(36,8),
  closing_fee           NUMERIC(36,8),
  opened_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at             TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS futures_positions_user_idx   ON public.futures_positions (user_id);
CREATE INDEX IF NOT EXISTS futures_positions_status_idx ON public.futures_positions (status);

ALTER TABLE public.futures_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "futures_positions: read own"
  ON public.futures_positions FOR SELECT
  USING (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS public.futures_orders (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position_id     UUID        REFERENCES public.futures_positions(id),
  chain_id        INTEGER     NOT NULL,
  pair            TEXT        NOT NULL,
  side            TEXT        NOT NULL CHECK (side IN ('long', 'short')),
  order_type      TEXT        NOT NULL CHECK (order_type IN ('market', 'limit', 'stop_loss', 'take_profit')),
  size_usd        NUMERIC(36,8) NOT NULL,
  collateral_usd  NUMERIC(36,8),
  leverage        NUMERIC(8,2),
  trigger_price   NUMERIC(36,8),
  status          TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'executed', 'cancelled', 'failed')),
  tx_hash         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS futures_orders_user_idx     ON public.futures_orders (user_id);
CREATE INDEX IF NOT EXISTS futures_orders_position_idx ON public.futures_orders (position_id);

ALTER TABLE public.futures_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "futures_orders: read own"
  ON public.futures_orders FOR SELECT
  USING (auth.uid() = user_id);


NOTIFY pgrst, 'reload schema';
