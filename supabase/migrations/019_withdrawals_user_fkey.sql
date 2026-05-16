ALTER TABLE public.withdrawals
    ADD CONSTRAINT withdrawals_user_id_public_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
