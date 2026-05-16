ALTER TABLE kyc_submissions
    ADD COLUMN IF NOT EXISTS provider             TEXT    DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS provider_inquiry_id  TEXT    DEFAULT NULL;


CREATE INDEX IF NOT EXISTS idx_kyc_provider_inquiry_id
    ON kyc_submissions (provider_inquiry_id)
    WHERE provider_inquiry_id IS NOT NULL;

COMMENT ON COLUMN kyc_submissions.provider IS
    'KYC provider used: ''persona'' | NULL (manual)';
COMMENT ON COLUMN kyc_submissions.provider_inquiry_id IS
    'Persona inquiry ID (inq_xxx) returned by their SDK';
