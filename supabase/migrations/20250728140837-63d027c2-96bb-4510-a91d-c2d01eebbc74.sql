-- Remover usuário admin existente para recriar corretamente
DELETE FROM public.usuarios WHERE email = 'admin@teste.com';
DELETE FROM auth.users WHERE email = 'admin@teste.com';

-- Inserir usuário admin na tabela auth.users usando a função interna do Supabase
-- Isso garante que a senha seja hasheada corretamente
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'admin@teste.com',
    crypt('admin123', gen_salt('bf')), -- Hash correto da senha usando bcrypt
    now(),
    now(),
    '',
    now(),
    '',
    NULL,
    '',
    '',
    NULL,
    NULL,
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    false,
    now(),
    now(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL
);

-- Inserir na tabela usuarios
INSERT INTO public.usuarios (
    id,
    nome,
    telefone,
    email,
    cpf,
    funcao,
    data_cadastro,
    ativo
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'ADMIN TESTE',
    '(11) 99999-9999',
    'admin@teste.com',
    '111.111.111-11',
    'ADMINISTRADOR_GERAL',
    now(),
    true
);