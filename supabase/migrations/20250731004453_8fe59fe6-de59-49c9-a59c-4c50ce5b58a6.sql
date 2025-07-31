-- Recriar função get_usuario_atual() como wrapper para compatibilidade
CREATE OR REPLACE FUNCTION public.get_usuario_atual()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN get_usuario_atual_robusto();
END;
$$;

-- Recriar função debug_auth_context que estava faltando
CREATE OR REPLACE FUNCTION public.debug_auth_context()
RETURNS TABLE(auth_uid uuid, auth_email text, get_usuario_atual_result uuid, usuario_exists boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY SELECT 
    auth.uid() as auth_uid,
    auth.email() as auth_email,
    get_usuario_atual() as get_usuario_atual_result,
    EXISTS(SELECT 1 FROM public.usuarios WHERE user_id = auth.uid() AND ativo = true) as usuario_exists;
END;
$$;

-- Criar função get_funcao_usuario_atual para compatibilidade
CREATE OR REPLACE FUNCTION public.get_funcao_usuario_atual()
RETURNS funcao_usuario
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role funcao_usuario;
BEGIN
  SELECT funcao INTO user_role
  FROM public.usuarios 
  WHERE user_id = auth.uid() AND ativo = true
  LIMIT 1;
  
  RETURN user_role;
END;
$$;