
CREATE TABLE IF NOT EXISTS spot_orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    pair            TEXT NOT NULL,
    base            TEXT NOT NULL,
    quote           TEXT NOT NULL,

    side            TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
    type            TEXT NOT NULL CHECK (type IN ('market', 'limit')),

    amount          NUMERIC(28, 10) NOT NULL, 
    price           NUMERIC(28, 10), 
    filled_amount   NUMERIC(28, 10) DEFAULT 0,
    avg_fill_price  NUMERIC(28, 10),

    total           NUMERIC(28, 10),
    fee             NUMERIC(28, 10) DEFAULT 0,
    fee_token       TEXT,

    status          TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'filled', 'cancelled', 'partial')),

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    filled_at       TIMESTAMPTZ,
    cancelled_at    TIMESTAMPTZ
);



CREATE TABLE IF NOT EXISTS spot_trades (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL REFERENCES spot_orders(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    pair        TEXT NOT NULL,
    side        TEXT NOT NULL CHECK (side IN ('buy', 'sell')),

    amount      NUMERIC(28, 10) NOT NULL, 
    price       NUMERIC(28, 10) NOT NULL,
    total       NUMERIC(28, 10) NOT NULL, 
    fee         NUMERIC(28, 10) NOT NULL,
    fee_token   TEXT NOT NULL,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS idx_spot_orders_user_id  ON spot_orders (user_id);
CREATE INDEX IF NOT EXISTS idx_spot_orders_status   ON spot_orders (status);
CREATE INDEX IF NOT EXISTS idx_spot_orders_pair     ON spot_orders (pair);
CREATE INDEX IF NOT EXISTS idx_spot_trades_user_id  ON spot_trades (user_id);
CREATE INDEX IF NOT EXISTS idx_spot_trades_order_id ON spot_trades (order_id);


ALTER TABLE spot_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE spot_trades ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_read_own_spot_orders"
    ON spot_orders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "users_read_own_spot_trades"
    ON spot_trades FOR SELECT
    USING (auth.uid() = user_id);
