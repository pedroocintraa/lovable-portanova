-- CORREÇÃO COMPLETA DAS POLÍTICAS RLS E FUNÇÕES (Versão 2)
-- Remove todas as políticas problemáticas e recria com funções security definer corretas

-- 1. REMOVER TODAS AS POLÍTICAS RLS EXISTENTES COM PROBLEMAS
DROP POLICY IF EXISTS "Administradores podem ver todos os usuários" ON public.usuarios;
DROP POLICY IF EXISTS "Supervisores podem ver sua equipe" ON public.usuarios;
DROP POLICY IF EXISTS "Supervisores de equipe podem ver sua equipe" ON public.usuarios;
DROP POLICY IF EXISTS "Vendedores podem ver apenas próprio perfil" ON public.usuarios;
DROP POLICY IF EXISTS "Administradores podem inserir qualquer usuário" ON public.usuarios;
DROP POLICY IF EXISTS "Supervisores podem inserir vendedores e supervisores de equipe" ON public.usuarios;
DROP POLICY IF EXISTS "Supervisores de equipe podem inserir vendedores" ON public.usuarios;
DROP POLICY IF EXISTS "Administradores podem atualizar qualquer usuário" ON public.usuarios;
DROP POLICY IF EXISTS "Supervisores podem atualizar sua equipe" ON public.usuarios;
DROP POLICY IF EXISTS "Supervisores de equipe podem atualizar sua equipe" ON public.usuarios;
DROP POLICY IF EXISTS "Vendedores podem atualizar próprio perfil" ON public.usuarios;

-- Remover políticas de outras tabelas que também têm problemas
DROP POLICY IF EXISTS "Administradores podem gerenciar equipes" ON public.equipes;
DROP POLICY IF EXISTS "Todos podem visualizar equipes ativas" ON public.equipes;

-- Remover políticas antigas de planos e datas_vencimento
DROP POLICY IF EXISTS "Administradores podem gerenciar planos" ON public.planos;
DROP POLICY IF EXISTS "Todos podem visualizar planos ativos" ON public.planos;
DROP POLICY IF EXISTS "Administradores podem gerenciar datas de vencimento" ON public.datas_vencimento;
DROP POLICY IF EXISTS "Todos podem visualizar datas de vencimento ativas" ON public.datas_vencimento;

-- 2. RECRIAR FUNÇÕES SECURITY DEFINER SEM RECURSÃO

-- Função para obter usuário atual pelo email do auth
CREATE OR REPLACE FUNCTION public.get_usuario_atual()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT id FROM public.usuarios WHERE email = auth.email() AND ativo = true LIMIT 1;
$function$;

-- Função para obter função do usuário atual
CREATE OR REPLACE FUNCTION public.get_funcao_usuario_atual()
RETURNS funcao_usuario
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT funcao FROM public.usuarios WHERE email = auth.email() AND ativo = true LIMIT 1;
$function$;

-- Função para verificar se é admin ou supervisor
CREATE OR REPLACE FUNCTION public.is_admin_or_supervisor()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT get_funcao_usuario_atual() IN ('ADMINISTRADOR_GERAL', 'SUPERVISOR');
$function$;

-- Função para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT get_funcao_usuario_atual() = 'ADMINISTRADOR_GERAL';
$function$;

-- Função para obter equipe do usuário atual
CREATE OR REPLACE FUNCTION public.get_equipe_usuario_atual()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT equipe_id FROM public.usuarios WHERE email = auth.email() AND ativo = true LIMIT 1;
$function$;

-- 3. RECRIAR POLÍTICAS RLS PARA USUARIOS SEM RECURSÃO

-- Políticas SELECT para usuarios
CREATE POLICY "usuarios_select_admin" ON public.usuarios
FOR SELECT TO authenticated
USING (get_funcao_usuario_atual() = 'ADMINISTRADOR_GERAL');

CREATE POLICY "usuarios_select_supervisor" ON public.usuarios
FOR SELECT TO authenticated
USING (
  get_funcao_usuario_atual() = 'SUPERVISOR' 
  AND (equipe_id = get_equipe_usuario_atual() OR id = get_usuario_atual())
);

CREATE POLICY "usuarios_select_supervisor_equipe" ON public.usuarios
FOR SELECT TO authenticated
USING (
  get_funcao_usuario_atual() = 'SUPERVISOR_EQUIPE' 
  AND (equipe_id = get_equipe_usuario_atual() OR id = get_usuario_atual())
);

CREATE POLICY "usuarios_select_vendedor" ON public.usuarios
FOR SELECT TO authenticated
USING (
  get_funcao_usuario_atual() = 'VENDEDOR' 
  AND id = get_usuario_atual()
);

-- Políticas INSERT para usuarios
CREATE POLICY "usuarios_insert_admin" ON public.usuarios
FOR INSERT TO authenticated
WITH CHECK (get_funcao_usuario_atual() = 'ADMINISTRADOR_GERAL');

CREATE POLICY "usuarios_insert_supervisor" ON public.usuarios
FOR INSERT TO authenticated
WITH CHECK (
  get_funcao_usuario_atual() = 'SUPERVISOR' 
  AND funcao IN ('VENDEDOR', 'SUPERVISOR_EQUIPE')
);

CREATE POLICY "usuarios_insert_supervisor_equipe" ON public.usuarios
FOR INSERT TO authenticated
WITH CHECK (
  get_funcao_usuario_atual() = 'SUPERVISOR_EQUIPE' 
  AND funcao = 'VENDEDOR'
  AND equipe_id = get_equipe_usuario_atual()
);

-- Políticas UPDATE para usuarios
CREATE POLICY "usuarios_update_admin" ON public.usuarios
FOR UPDATE TO authenticated
USING (get_funcao_usuario_atual() = 'ADMINISTRADOR_GERAL');

CREATE POLICY "usuarios_update_supervisor" ON public.usuarios
FOR UPDATE TO authenticated
USING (
  get_funcao_usuario_atual() = 'SUPERVISOR' 
  AND (equipe_id = get_equipe_usuario_atual() OR id = get_usuario_atual())
);

CREATE POLICY "usuarios_update_supervisor_equipe" ON public.usuarios
FOR UPDATE TO authenticated
USING (
  get_funcao_usuario_atual() = 'SUPERVISOR_EQUIPE' 
  AND (equipe_id = get_equipe_usuario_atual() OR id = get_usuario_atual())
);

CREATE POLICY "usuarios_update_vendedor" ON public.usuarios
FOR UPDATE TO authenticated
USING (
  get_funcao_usuario_atual() = 'VENDEDOR' 
  AND id = get_usuario_atual()
);

-- 4. RECRIAR POLÍTICAS RLS PARA EQUIPES

CREATE POLICY "equipes_select_all" ON public.equipes
FOR SELECT TO authenticated
USING (ativo = true);

CREATE POLICY "equipes_manage_admin" ON public.equipes
FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- 5. CRIAR/ATUALIZAR POLÍTICAS PARA PLANOS E DATAS_VENCIMENTO

-- Políticas para planos
CREATE POLICY "planos_select_all" ON public.planos
FOR SELECT TO authenticated
USING (ativo = true);

CREATE POLICY "planos_manage_admin" ON public.planos
FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Políticas para datas_vencimento  
CREATE POLICY "datas_vencimento_select_all" ON public.datas_vencimento
FOR SELECT TO authenticated
USING (ativo = true);

CREATE POLICY "datas_vencimento_manage_admin" ON public.datas_vencimento
FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- 6. GARANTIR QUE O USUÁRIO ADMIN EXISTE NO AUTH
-- Primeiro, inserir no auth.users se não existir
DO $$
BEGIN
  -- Tentar inserir no auth.users
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'admin@teste.com',
    crypt('admin123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '',
    '',
    '',
    ''
  ) ON CONFLICT (id) DO NOTHING;
  
  -- Inserir/atualizar na tabela usuarios
  INSERT INTO public.usuarios (
    id,
    nome, 
    telefone, 
    email, 
    cpf, 
    funcao,
    data_cadastro,
    ativo
  ) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'ADMIN TESTE',
    '11999999999',
    'admin@teste.com',
    '11111111111',
    'ADMINISTRADOR_GERAL'::funcao_usuario,
    now(),
    true
  ) ON CONFLICT (email) DO UPDATE SET
    funcao = EXCLUDED.funcao,
    ativo = EXCLUDED.ativo,
    id = EXCLUDED.id;
    
EXCEPTION WHEN OTHERS THEN
  -- Se der erro, só atualizar o usuário existente
  UPDATE public.usuarios 
  SET funcao = 'ADMINISTRADOR_GERAL'::funcao_usuario, 
      ativo = true 
  WHERE email = 'admin@teste.com';
END$$;