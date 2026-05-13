INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    aud,
    role,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    banned_until
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'treasury@internal.tradesk',
    crypt(gen_random_uuid()::text, gen_salt('bf')),  
    NOW(),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    'infinity' 
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, full_name, onboarded)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'treasury@internal.tradesk',
    'Platform Treasury',
    true
)
ON CONFLICT (id) DO NOTHING;
