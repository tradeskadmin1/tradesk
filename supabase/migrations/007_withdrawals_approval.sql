ALTER TABLE public.withdrawals
    DROP CONSTRAINT IF EXISTS withdrawals_status_check;

ALTER TABLE public.withdrawals
    ADD CONSTRAINT withdrawals_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed', 'failed'));

ALTER TABLE public.withdrawals
    ADD COLUMN IF NOT EXISTS auto_approved     BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS approved_by       UUID        REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS approved_at       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejected_at       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejection_reason  TEXT;

CREATE INDEX IF NOT EXISTS withdrawals_pending_idx
    ON public.withdrawals (status, created_at)
    WHERE status = 'pending';


NOTIFY pgrst, 'reload schema';
