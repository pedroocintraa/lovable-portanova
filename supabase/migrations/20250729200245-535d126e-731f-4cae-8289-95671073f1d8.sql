-- Forçar confirmação de email para usuário específico
UPDATE auth.users 
SET email_confirmed_at = now(), 
    updated_at = now()
WHERE email = 'pedroocintraa22@gmail.com' AND email_confirmed_at IS NULL;