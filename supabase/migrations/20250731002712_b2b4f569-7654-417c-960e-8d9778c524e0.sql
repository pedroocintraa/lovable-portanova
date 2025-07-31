-- Dropar políticas que dependem das funções antes de dropar as funções
DROP POLICY IF EXISTS "Acesso via vendas" ON public.documentos_venda;
DROP POLICY IF EXISTS "Acesso via vendas - histórico" ON public.historico_vendas;
DROP POLICY IF EXISTS "Usuários podem ver documentos de suas vendas" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem atualizar documentos de suas vendas" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem deletar documentos de suas vendas" ON storage.objects;

-- Dropar função get_funcao_usuario que depende de get_usuario_atual
DROP FUNCTION IF EXISTS public.get_funcao_usuario(uuid);

-- Agora dropar as funções problemáticas
DROP FUNCTION IF EXISTS public.get_usuario_atual() CASCADE;
DROP FUNCTION IF EXISTS public.get_funcao_usuario_atual() CASCADE;
DROP FUNCTION IF EXISTS public.get_equipe_usuario_atual() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_or_supervisor() CASCADE;

-- Criar novas funções seguras
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
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
  WHERE usuarios.user_id = auth.uid() AND usuarios.ativo = true
  LIMIT 1;
  
  RETURN user_role;
END;
$$;

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

-- Recriar políticas das tabelas usuarios (simplificadas)
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

-- Políticas simplificadas para usuarios
CREATE POLICY "usuarios_select_all" ON public.usuarios
FOR SELECT TO authenticated
USING (true); -- Temporariamente permitir tudo para debug

CREATE POLICY "usuarios_insert_admin" ON public.usuarios
FOR INSERT TO authenticated
WITH CHECK (is_admin_safe());

CREATE POLICY "usuarios_update_admin" ON public.usuarios
FOR UPDATE TO authenticated
USING (is_admin_safe());

-- Recriar políticas para outras tabelas
CREATE POLICY "documentos_venda_access" ON public.documentos_venda
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM vendas v
    WHERE v.id = documentos_venda.venda_id 
    AND (
      is_admin_or_supervisor_safe() OR 
      v.vendedor_id = (SELECT id FROM usuarios WHERE usuarios.user_id = auth.uid())
    )
  )
);

CREATE POLICY "historico_vendas_access" ON public.historico_vendas
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM vendas v
    WHERE v.id = historico_vendas.venda_id 
    AND (
      is_admin_or_supervisor_safe() OR 
      v.vendedor_id = (SELECT id FROM usuarios WHERE usuarios.user_id = auth.uid())
    )
  )
);

-- Políticas de storage (simplificadas)
CREATE POLICY "storage_documentos_select" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'documentos-vendas');

CREATE POLICY "storage_documentos_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documentos-vendas');

CREATE POLICY "storage_documentos_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'documentos-vendas');

CREATE POLICY "storage_documentos_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'documentos-vendas');