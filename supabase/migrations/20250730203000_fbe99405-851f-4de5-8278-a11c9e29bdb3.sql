-- Corrigir a função get_usuario_atual para ser mais robusta
CREATE OR REPLACE FUNCTION public.get_usuario_atual()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$