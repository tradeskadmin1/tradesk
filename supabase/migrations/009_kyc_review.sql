ALTER TABLE public.kyc_submissions
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS reviewed_by      TEXT; 

CREATE INDEX IF NOT EXISTS kyc_submissions_status_idx
    ON public.kyc_submissions (status, submitted_at DESC);
