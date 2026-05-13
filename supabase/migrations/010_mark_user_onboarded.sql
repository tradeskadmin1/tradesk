CREATE OR REPLACE FUNCTION public.mark_user_onboarded(
    p_user_id  UUID,
    p_email    TEXT DEFAULT NULL,
    p_full_name TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, onboarded)
    VALUES (p_user_id, p_email, p_full_name, TRUE)
    ON CONFLICT (id) DO UPDATE
        SET onboarded  = TRUE,
            email      = COALESCE(EXCLUDED.email,     public.users.email),
            full_name  = COALESCE(EXCLUDED.full_name, public.users.full_name),
            updated_at = NOW();
END;
$$;
