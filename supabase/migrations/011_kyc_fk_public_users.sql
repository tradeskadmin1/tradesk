-- Re-point kyc_submissions.user_id → public.users(id) so PostgREST
-- can traverse the join when the admin API queries users!inner.
-- Previously it referenced auth.users(id) which is invisible to PostgREST.

ALTER TABLE public.kyc_submissions
    DROP CONSTRAINT IF EXISTS kyc_submissions_user_id_fkey;

ALTER TABLE public.kyc_submissions
    ADD CONSTRAINT kyc_submissions_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.users (id)
        ON DELETE CASCADE;
