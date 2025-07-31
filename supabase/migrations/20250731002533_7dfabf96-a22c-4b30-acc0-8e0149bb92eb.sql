-- Dropar funções problemáticas que causam recursão
DROP FUNCTION IF EXISTS public.get_usuario_atual();
DROP FUNCTION IF EXISTS public.get_funcao_usuario_atual();
DROP FUNCTION IF EXISTS public.get_equipe_usuario_atual();

-- Criar função simples e segura para obter ID do usuário atual
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT auth.uid();
$$;

-- Criar função segura para obter role do usuário sem RLS
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS funcao_usuario
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role funcao_usuario;
BEGIN
  -- Buscar diretamente sem depender de RLS
  SELECT funcao INTO user_role
  FROM public.usuarios 
  WHERE usuarios.user_id = auth.uid() AND usuarios.ativo = true
  LIMIT 1;
  
  RETURN user_role;
END;
$$;

-- Criar função segura para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_admin_safe()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.usuarios 
    WHERE usuarios.user_id = auth.uid() 
    AND usuarios.funcao = 'ADMINISTRADOR_GERAL'::funcao_usuario 
    AND usuarios.ativo = true
  );
$$;

-- Criar função segura para verificar se é admin ou supervisor
CREATE OR REPLACE FUNCTION public.is_admin_or_supervisor_safe()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.usuarios 
    WHERE usuarios.user_id = auth.uid() 
    AND usuarios.funcao IN ('ADMINISTRADOR_GERAL'::funcao_usuario, 'SUPERVISOR'::funcao_usuario)
    AND usuarios.ativo = true
  );
$$;

-- Dropar políticas existentes que usam as funções problemáticas
DROP POLICY IF EXISTS "usuarios_select_admin_uid" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_supervisor_uid" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_supervisor_equipe_uid" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_vendedor_uid" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert_admin_uid" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert_supervisor_uid" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert_supervisor_equipe_uid" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_admin_uid" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_supervisor_uid" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_supervisor_equipe_uid" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_vendedor_uid" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_prevent_self_role_elevation_uid" ON public.usuarios;

-- Recriar políticas simplificadas e seguras
CREATE POLICY "usuarios_select_admin_safe" ON public.usuarios
FOR SELECT TO authenticated
USING (is_admin_safe());

CREATE POLICY "usuarios_select_supervisor_safe" ON public.usuarios
FOR SELECT TO authenticated
USING (
  is_admin_or_supervisor_safe() OR 
  usuarios.user_id = auth.uid()
);

CREATE POLICY "usuarios_select_own" ON public.usuarios
FOR SELECT TO authenticated
USING (usuarios.user_id = auth.uid());

CREATE POLICY "usuarios_insert_admin_safe" ON public.usuarios
FOR INSERT TO authenticated
WITH CHECK (is_admin_safe());

CREATE POLICY "usuarios_update_admin_safe" ON public.usuarios
FOR UPDATE TO authenticated
USING (is_admin_safe());

CREATE POLICY "usuarios_update_own_safe" ON public.usuarios
FOR UPDATE TO authenticated
USING (usuarios.user_id = auth.uid())
WITH CHECK (
  usuarios.user_id = auth.uid() AND 
  -- Não permite auto-elevação de privilégios
  funcao = (SELECT funcao FROM public.usuarios WHERE usuarios.user_id = auth.uid())
);

-- Atualizar outras políticas que dependem das funções antigas
UPDATE pg_policies SET polcond = replace(polcond::text, 'get_usuario_atual()', 'auth.uid()')::text::pg_node_tree 
WHERE schemaname = 'public' AND polcond::text LIKE '%get_usuario_atual%';

UPDATE pg_policies SET polwithcheck = replace(polwithcheck::text, 'get_usuario_atual()', 'auth.uid()')::text::pg_node_tree 
WHERE schemaname = 'public' AND polwithcheck::text LIKE '%get_usuario_atual%';

-- Recriar política de auditoria sem recursão
DROP TRIGGER IF EXISTS audit_usuario_changes ON public.usuarios;
DROP FUNCTION IF EXISTS public.audit_usuario_changes();

CREATE OR REPLACE FUNCTION public.audit_usuario_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log role changes
  IF OLD.funcao IS DISTINCT FROM NEW.funcao THEN
    PERFORM log_security_event(
      'ROLE_CHANGE',
      'usuarios',
      NEW.id,
      jsonb_build_object('funcao', OLD.funcao),
      jsonb_build_object('funcao', NEW.funcao)
    );
  END IF;
  
  -- Log status changes (activation/deactivation)
  IF OLD.ativo IS DISTINCT FROM NEW.ativo THEN
    PERFORM log_security_event(
      CASE WHEN NEW.ativo THEN 'USER_ACTIVATED' ELSE 'USER_DEACTIVATED' END,
      'usuarios',
      NEW.id,
      jsonb_build_object('ativo', OLD.ativo),
      jsonb_build_object('ativo', NEW.ativo)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_usuario_changes
  AFTER UPDATE ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_usuario_changes();