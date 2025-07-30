-- Função de debug avançada para autenticação
CREATE OR REPLACE FUNCTION public.debug_auth_advanced()
RETURNS TABLE(
  auth_uid uuid,
  auth_email text,
  jwt_claims jsonb,
  session_valid boolean,
  usuario_encontrado boolean,
  usuario_id uuid,
  usuario_nome text,
  usuario_funcao funcao_usuario,
  timestamp_check timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY SELECT 
    auth.uid() as auth_uid,
    auth.email() as auth_email,
    auth.jwt() as jwt_claims,
    (auth.uid() IS NOT NULL) as session_valid,
    EXISTS(SELECT 1 FROM public.usuarios WHERE id = COALESCE(auth.uid(), (SELECT id FROM public.usuarios WHERE email = auth.email() AND ativo = true LIMIT 1))) as usuario_encontrado,
    COALESCE(
      auth.uid(),
      (SELECT id FROM public.usuarios WHERE email = auth.email() AND ativo = true LIMIT 1)
    ) as usuario_id,
    (SELECT nome FROM public.usuarios WHERE id = COALESCE(auth.uid(), (SELECT id FROM public.usuarios WHERE email = auth.email() AND ativo = true LIMIT 1))) as usuario_nome,
    (SELECT funcao FROM public.usuarios WHERE id = COALESCE(auth.uid(), (SELECT id FROM public.usuarios WHERE email = auth.email() AND ativo = true LIMIT 1))) as usuario_funcao,
    now() as timestamp_check;
END;
$$;

-- Função robusta para obter usuário atual com fallback
CREATE OR REPLACE FUNCTION public.get_usuario_atual_robusto()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_id uuid;
  user_email text;
BEGIN
  -- Primeiro tenta pelo auth.uid()
  user_id := auth.uid();
  
  IF user_id IS NOT NULL THEN
    -- Verifica se o usuário existe na tabela usuarios
    IF EXISTS(SELECT 1 FROM public.usuarios WHERE id = user_id AND ativo = true) THEN
      RETURN user_id;
    END IF;
  END IF;
  
  -- Fallback: busca por email
  user_email := auth.email();
  
  IF user_email IS NOT NULL THEN
    SELECT id INTO user_id
    FROM public.usuarios 
    WHERE email = user_email AND ativo = true 
    LIMIT 1;
    
    RETURN user_id;
  END IF;
  
  -- Se chegou até aqui, não conseguiu encontrar o usuário
  RETURN NULL;
END;
$$;

-- Atualizar função get_usuario_atual para usar a versão robusta
CREATE OR REPLACE FUNCTION public.get_usuario_atual()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT get_usuario_atual_robusto();
$$;