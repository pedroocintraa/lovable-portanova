-- Correção dos problemas de segurança identificados

-- 1. Corrigir search_path das funções
CREATE OR REPLACE FUNCTION public.migrar_usuario_para_auth(
  p_usuario_id UUID,
  p_email TEXT,
  p_senha TEXT DEFAULT 'senha123'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auth_user_id UUID;
BEGIN
  -- Log para migração
  RAISE NOTICE 'Preparando migração para usuário: % (email: %)', p_usuario_id, p_email;
END;
$$;

-- 2. Corrigir search_path da função de sincronização
CREATE OR REPLACE FUNCTION public.sincronizar_usuario_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Atualizar dados na tabela usuarios quando auth.users for modificado
  IF TG_OP = 'UPDATE' AND OLD.email IS DISTINCT FROM NEW.email THEN
    UPDATE public.usuarios 
    SET email = NEW.email, updated_at = now()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;