-- Corrigindo avisos de segurança - adicionando search_path a todas as funções

-- 1. Corrigir função get_usuario_atual
CREATE OR REPLACE FUNCTION public.get_usuario_atual()
RETURNS UUID
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT id FROM public.usuarios WHERE email = auth.email();
$$;

-- 2. Corrigir função get_funcao_usuario
CREATE OR REPLACE FUNCTION public.get_funcao_usuario(user_id UUID DEFAULT public.get_usuario_atual())
RETURNS funcao_usuario
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT funcao FROM public.usuarios WHERE id = user_id;
$$;

-- 3. Corrigir função is_admin_or_supervisor
CREATE OR REPLACE FUNCTION public.is_admin_or_supervisor()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_funcao_usuario() IN ('ADMINISTRADOR_GERAL', 'SUPERVISOR');
$$;

-- 4. Corrigir função update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 5. Corrigir função registrar_mudanca_status
CREATE OR REPLACE FUNCTION public.registrar_mudanca_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.historico_vendas (
      venda_id, 
      status_anterior, 
      status_novo, 
      usuario_id,
      observacao
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      get_usuario_atual(),
      'Alteração automática de status'
    );
  END IF;
  RETURN NEW;
END;
$$;