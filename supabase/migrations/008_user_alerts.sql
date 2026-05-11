CREATE TABLE IF NOT EXISTS user_alerts (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    label         TEXT        NOT NULL,

    type          TEXT        NOT NULL DEFAULT 'price'
                              CHECK (type IN ('price', 'spread')),

    token         TEXT        NOT NULL,

    condition     TEXT        NOT NULL CHECK (condition IN ('above', 'below')),

    threshold     NUMERIC(36, 8) NOT NULL,

    status        TEXT        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'triggered', 'dismissed')),
    triggered_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_alerts_active_idx
    ON user_alerts (user_id, status)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS user_alerts_user_idx
    ON user_alerts (user_id, created_at DESC);

ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_alerts"
    ON user_alerts
    FOR ALL
    USING  (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
