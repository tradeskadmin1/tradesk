CREATE INDEX IF NOT EXISTS idx_futures_positions_liquidation
    ON public.futures_positions (status, liquidation_price)
    WHERE status = 'open' AND liquidation_price IS NOT NULL;

NOTIFY pgrst, 'reload schema';
