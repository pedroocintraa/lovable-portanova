-- Remover todas as políticas RLS existentes
DROP POLICY IF EXISTS "usuarios_select_supervisor_uid" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_supervisor_equipe_uid" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_vendedor_uid" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_supervisor_uid" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_supervisor_equipe_uid" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_vendedor_uid" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_prevent_self_role_elevation_uid" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_all" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert_admin" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_admin" ON public.usuarios;

DROP POLICY IF EXISTS "vendas_update_by_uid" ON public.vendas;
DROP POLICY IF EXISTS "vendas_select_by_uid" ON public.vendas;
DROP POLICY IF EXISTS "vendas_insert_by_uid" ON public.vendas;

DROP POLICY IF EXISTS "clientes_update_by_uid" ON public.clientes;
DROP POLICY IF EXISTS "clientes_select_by_uid" ON public.clientes;
DROP POLICY IF EXISTS "clientes_insert_by_uid" ON public.clientes;

DROP POLICY IF EXISTS "enderecos_update_by_uid" ON public.enderecos;
DROP POLICY IF EXISTS "enderecos_select_by_uid" ON public.enderecos;
DROP POLICY IF EXISTS "enderecos_insert_by_uid" ON public.enderecos;

DROP POLICY IF EXISTS "documentos_venda_access" ON public.documentos_venda;
DROP POLICY IF EXISTS "historico_vendas_access" ON public.historico_vendas;
DROP POLICY IF EXISTS "equipes_select_all" ON public.equipes;
DROP POLICY IF EXISTS "planos_select_all" ON public.planos;

-- Habilitar RLS em todas as tabelas (caso não esteja habilitado)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enderecos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Criar políticas simplificadas para todas as tabelas
-- Tabela usuarios
CREATE POLICY "usuarios_authenticated_all" ON public.usuarios
FOR ALL USING (auth.uid() IS NOT NULL);

-- Tabela vendas
CREATE POLICY "vendas_authenticated_all" ON public.vendas
FOR ALL USING (auth.uid() IS NOT NULL);

-- Tabela clientes
CREATE POLICY "clientes_authenticated_all" ON public.clientes
FOR ALL USING (auth.uid() IS NOT NULL);

-- Tabela enderecos
CREATE POLICY "enderecos_authenticated_all" ON public.enderecos
FOR ALL USING (auth.uid() IS NOT NULL);

-- Tabela documentos_venda
CREATE POLICY "documentos_venda_authenticated_all" ON public.documentos_venda
FOR ALL USING (auth.uid() IS NOT NULL);

-- Tabela historico_vendas
CREATE POLICY "historico_vendas_authenticated_all" ON public.historico_vendas
FOR ALL USING (auth.uid() IS NOT NULL);

-- Tabela equipes
CREATE POLICY "equipes_authenticated_all" ON public.equipes
FOR ALL USING (auth.uid() IS NOT NULL);

-- Tabela planos
CREATE POLICY "planos_authenticated_all" ON public.planos
FOR ALL USING (auth.uid() IS NOT NULL);

-- Tabela security_audit
CREATE POLICY "security_audit_authenticated_all" ON public.security_audit
FOR ALL USING (auth.uid() IS NOT NULL);

-- Tabela login_attempts
CREATE POLICY "login_attempts_authenticated_all" ON public.login_attempts
FOR ALL USING (auth.uid() IS NOT NULL);