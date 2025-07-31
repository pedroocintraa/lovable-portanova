-- Criar função para debug completo do contexto de autenticação após a migração
CREATE OR REPLACE FUNCTION public.debug_user_migration_status(p_email text)
RETURNS TABLE(
  email_param text,
  auth_user_exists boolean,
  auth_user_id uuid,
  usuarios_record_exists boolean,
  usuarios_id uuid,
  usuarios_user_id uuid,
  usuarios_ativo boolean,
  usuarios_funcao funcao_usuario,
  user_id_match boolean,
  can_access_system boolean,
  rls_test_result boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auth_uid uuid;
  usuario_rec RECORD;
BEGIN
  -- Buscar ID do usuário no auth.users (apenas admin pode fazer isso)
  SELECT id INTO auth_uid FROM auth.users WHERE email = p_email LIMIT 1;
  
  -- Buscar registro na tabela usuarios
  SELECT * INTO usuario_rec FROM public.usuarios WHERE email = p_email LIMIT 1;
  
  -- Testar se as RLS policies funcionariam
  RETURN QUERY
  SELECT 
    p_email as email_param,
    (auth_uid IS NOT NULL) as auth_user_exists,
    auth_uid as auth_user_id,
    (usuario_rec.id IS NOT NULL) as usuarios_record_exists,
    usuario_rec.id as usuarios_id,
    usuario_rec.user_id as usuarios_user_id,
    COALESCE(usuario_rec.ativo, false) as usuarios_ativo,
    usuario_rec.funcao as usuarios_funcao,
    (auth_uid IS NOT NULL AND usuario_rec.user_id IS NOT NULL AND auth_uid = usuario_rec.user_id) as user_id_match,
    (auth_uid IS NOT NULL AND usuario_rec.user_id IS NOT NULL AND auth_uid = usuario_rec.user_id AND usuario_rec.ativo = true) as can_access_system,
    (auth_uid IS NOT NULL AND usuario_rec.user_id IS NOT NULL AND auth_uid = usuario_rec.user_id AND usuario_rec.ativo = true) as rls_test_result;
END;
$$;