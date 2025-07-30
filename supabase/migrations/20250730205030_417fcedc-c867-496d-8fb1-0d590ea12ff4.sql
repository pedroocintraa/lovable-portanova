-- CORREÇÃO DEFINITIVA: Modificar todas as políticas RLS para usar auth.email() diretamente
-- Isso elimina a dependência do auth.uid() problemático

-- 1. Atualizar get_usuario_atual para priorizar completamente auth.email()
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
  -- PRIORIZAR auth.email() sobre auth.uid()
  user_email := auth.email();
  
  IF user_email IS NOT NULL THEN
    SELECT id INTO user_id
    FROM public.usuarios 
    WHERE email = user_email AND ativo = true 
    LIMIT 1;
    
    IF user_id IS NOT NULL THEN
      RETURN user_id;
    END IF;
  END IF;
  
  -- Fallback: tenta auth.uid() apenas se email falhou
  user_id := auth.uid();
  
  IF user_id IS NOT NULL THEN
    IF EXISTS(SELECT 1 FROM public.usuarios WHERE id = user_id AND ativo = true) THEN
      RETURN user_id;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$function$;

-- 2. Criar função auxiliar baseada apenas em email
CREATE OR REPLACE FUNCTION public.get_usuario_por_email()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_id uuid;
  user_email text;
BEGIN
  user_email := auth.email();
  
  IF user_email IS NOT NULL THEN
    SELECT id INTO user_id
    FROM public.usuarios 
    WHERE email = user_email AND ativo = true 
    LIMIT 1;
    
    RETURN user_id;
  END IF;
  
  RETURN NULL;
END;
$function$;