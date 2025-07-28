-- Passo 1: Corrigir funções security definer para evitar recursão infinita
DROP FUNCTION IF EXISTS public.get_usuario_atual();
DROP FUNCTION IF EXISTS public.get_funcao_usuario(uuid);
DROP FUNCTION IF EXISTS public.is_admin_or_supervisor();

-- Função para obter o usuário atual baseado no email do auth
CREATE OR REPLACE FUNCTION public.get_usuario_atual()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.usuarios WHERE email = auth.email() AND ativo = true LIMIT 1;
$$;

-- Função para obter a função do usuário
CREATE OR REPLACE FUNCTION public.get_funcao_usuario(user_id uuid DEFAULT get_usuario_atual())
RETURNS funcao_usuario
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT funcao FROM public.usuarios WHERE id = user_id AND ativo = true LIMIT 1;
$$;

-- Função para verificar se é admin ou supervisor
CREATE OR REPLACE FUNCTION public.is_admin_or_supervisor()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT get_funcao_usuario() IN ('ADMINISTRADOR_GERAL', 'SUPERVISOR');
$$;

-- Passo 2: Adicionar foreign keys corretas
ALTER TABLE public.usuarios 
DROP CONSTRAINT IF EXISTS usuarios_equipe_id_fkey;

ALTER TABLE public.usuarios 
ADD CONSTRAINT usuarios_equipe_id_fkey 
FOREIGN KEY (equipe_id) REFERENCES public.equipes(id);

ALTER TABLE public.usuarios 
DROP CONSTRAINT IF EXISTS usuarios_supervisor_equipe_id_fkey;

ALTER TABLE public.usuarios 
ADD CONSTRAINT usuarios_supervisor_equipe_id_fkey 
FOREIGN KEY (supervisor_equipe_id) REFERENCES public.usuarios(id);

-- Passo 3: Recriar políticas RLS para usuarios (sem recursão)
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

-- Políticas SELECT para usuarios
CREATE POLICY "Administradores podem ver todos os usuários" 
ON public.usuarios 
FOR SELECT 
USING (get_funcao_usuario() = 'ADMINISTRADOR_GERAL'::funcao_usuario);

CREATE POLICY "Supervisores podem ver sua equipe" 
ON public.usuarios 
FOR SELECT 
USING (
  get_funcao_usuario() = 'SUPERVISOR'::funcao_usuario OR 
  id = get_usuario_atual()
);

CREATE POLICY "Supervisores de equipe podem ver sua equipe" 
ON public.usuarios 
FOR SELECT 
USING (
  (get_funcao_usuario() = 'SUPERVISOR_EQUIPE'::funcao_usuario AND 
   equipe_id = (SELECT equipe_id FROM usuarios WHERE id = get_usuario_atual())) OR 
  id = get_usuario_atual()
);

CREATE POLICY "Vendedores podem ver apenas próprio perfil" 
ON public.usuarios 
FOR SELECT 
USING (
  get_funcao_usuario() = 'VENDEDOR'::funcao_usuario AND 
  id = get_usuario_atual()
);

-- Políticas INSERT para usuarios
CREATE POLICY "Administradores podem inserir qualquer usuário" 
ON public.usuarios 
FOR INSERT 
WITH CHECK (get_funcao_usuario() = 'ADMINISTRADOR_GERAL'::funcao_usuario);

CREATE POLICY "Supervisores podem inserir vendedores e supervisores de equipe" 
ON public.usuarios 
FOR INSERT 
WITH CHECK (
  get_funcao_usuario() = 'SUPERVISOR'::funcao_usuario AND 
  funcao = ANY (ARRAY['VENDEDOR'::funcao_usuario, 'SUPERVISOR_EQUIPE'::funcao_usuario])
);

CREATE POLICY "Supervisores de equipe podem inserir vendedores" 
ON public.usuarios 
FOR INSERT 
WITH CHECK (
  get_funcao_usuario() = 'SUPERVISOR_EQUIPE'::funcao_usuario AND 
  funcao = 'VENDEDOR'::funcao_usuario
);

-- Políticas UPDATE para usuarios
CREATE POLICY "Administradores podem atualizar qualquer usuário" 
ON public.usuarios 
FOR UPDATE 
USING (get_funcao_usuario() = 'ADMINISTRADOR_GERAL'::funcao_usuario);

CREATE POLICY "Supervisores podem atualizar sua equipe" 
ON public.usuarios 
FOR UPDATE 
USING (
  get_funcao_usuario() = 'SUPERVISOR'::funcao_usuario OR 
  id = get_usuario_atual()
);

CREATE POLICY "Supervisores de equipe podem atualizar sua equipe" 
ON public.usuarios 
FOR UPDATE 
USING (
  (get_funcao_usuario() = 'SUPERVISOR_EQUIPE'::funcao_usuario AND 
   equipe_id = (SELECT equipe_id FROM usuarios WHERE id = get_usuario_atual())) OR 
  id = get_usuario_atual()
);

CREATE POLICY "Vendedores podem atualizar próprio perfil" 
ON public.usuarios 
FOR UPDATE 
USING (
  get_funcao_usuario() = 'VENDEDOR'::funcao_usuario AND 
  id = get_usuario_atual()
);

-- Passo 4: Corrigir políticas RLS para equipes
DROP POLICY IF EXISTS "Administradores podem gerenciar equipes" ON public.equipes;
DROP POLICY IF EXISTS "Todos podem visualizar equipes ativas" ON public.equipes;

-- Política temporária mais permissiva para desenvolvimento
CREATE POLICY "Administradores podem gerenciar equipes" 
ON public.equipes 
FOR ALL 
USING (get_funcao_usuario() = 'ADMINISTRADOR_GERAL'::funcao_usuario)
WITH CHECK (get_funcao_usuario() = 'ADMINISTRADOR_GERAL'::funcao_usuario);

CREATE POLICY "Todos podem visualizar equipes ativas" 
ON public.equipes 
FOR SELECT 
USING (ativo = true);

-- Inserir dados de teste se não existirem
INSERT INTO public.usuarios (nome, telefone, email, cpf, funcao) 
VALUES ('ADMIN TESTE', '11999999999', 'admin@teste.com', '11111111111', 'ADMINISTRADOR_GERAL'::funcao_usuario)
ON CONFLICT (email) DO NOTHING;