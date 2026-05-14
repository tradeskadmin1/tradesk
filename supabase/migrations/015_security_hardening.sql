
CREATE SEQUENCE IF NOT EXISTS wallet_account_seq
    START WITH 0
    INCREMENT BY 1
    MINVALUE 0;


DO $$
DECLARE
    current_users bigint;
BEGIN
    SELECT COUNT(DISTINCT user_id) INTO current_users FROM custodial_wallets;
    IF current_users > 0 THEN
        PERFORM setval('wallet_account_seq', current_users);
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION next_wallet_index()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT nextval('wallet_account_seq')::integer;
$$;


CREATE TABLE IF NOT EXISTS rate_limits (
    key       text        PRIMARY KEY,
    count     integer     NOT NULL DEFAULT 1,
    reset_at  timestamptz NOT NULL
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON rate_limits
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION check_rate_limit(
    p_key       text,
    p_limit     integer,
    p_window_ms bigint
)
RETURNS TABLE (allowed boolean, remaining integer, reset_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now      timestamptz := now();
    v_reset    timestamptz := v_now + (p_window_ms || ' milliseconds')::interval;
    v_count    integer;
    v_reset_at timestamptz;
BEGIN
    INSERT INTO rate_limits (key, count, reset_at)
    VALUES (p_key, 1, v_reset)
    ON CONFLICT (key) DO UPDATE
        SET count    = CASE
                           WHEN rate_limits.reset_at <= v_now THEN 1
                           ELSE rate_limits.count + 1
                       END,
            reset_at = CASE
                           WHEN rate_limits.reset_at <= v_now THEN v_reset
                           ELSE rate_limits.reset_at
                       END
    RETURNING rate_limits.count, rate_limits.reset_at
    INTO v_count, v_reset_at;

    RETURN QUERY SELECT
        v_count <= p_limit,
        GREATEST(0, p_limit - v_count),
        v_reset_at;
END;
$$;


CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    DELETE FROM rate_limits WHERE reset_at < now();
$$;



ALTER TABLE arbitrage_opportunities
    ADD COLUMN IF NOT EXISTS claimed_by  uuid        REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS claimed_at  timestamptz;

CREATE OR REPLACE FUNCTION claim_arbitrage_opportunity(
    p_opportunity_id uuid,
    p_user_id        uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    updated integer;
BEGIN
    UPDATE arbitrage_opportunities
    SET claimed_by = p_user_id,
        claimed_at = now()
    WHERE id         = p_opportunity_id
      AND expires_at > now()
      AND claimed_by IS NULL;

    GET DIAGNOSTICS updated = ROW_COUNT;
    RETURN updated > 0;
END;
$$;
