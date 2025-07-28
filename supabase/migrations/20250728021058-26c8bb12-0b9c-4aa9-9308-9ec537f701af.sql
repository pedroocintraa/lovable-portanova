-- Adicionar SUPERVISOR_EQUIPE ao enum funcao_usuario
ALTER TYPE funcao_usuario ADD VALUE 'SUPERVISOR_EQUIPE';

-- Criar tabela equipes
CREATE TABLE public.equipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela equipes
ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;

-- Adicionar colunas na tabela usuarios
ALTER TABLE public.usuarios 
ADD COLUMN equipe_id UUID REFERENCES public.equipes(id),
ADD COLUMN supervisor_equipe_id UUID REFERENCES public.usuarios(id);

-- Políticas RLS para equipes
CREATE POLICY "Administradores podem gerenciar equipes" 
ON public.equipes 
FOR ALL 
USING (get_funcao_usuario() = 'ADMINISTRADOR_GERAL'::funcao_usuario);

CREATE POLICY "Todos podem visualizar equipes ativas" 
ON public.equipes 
FOR SELECT 
USING (ativo = true);

-- Atualizar políticas RLS para usuarios considerando equipes
DROP POLICY IF EXISTS "Supervisores podem ver vendedores" ON public.usuarios;
DROP POLICY IF EXISTS "Vendedores podem ver apenas próprio perfil" ON public.usuarios;

-- Nova política para supervisores verem sua equipe
CREATE POLICY "Supervisores podem ver sua equipe" 
ON public.usuarios 
FOR SELECT 
USING (
  (get_funcao_usuario() = 'SUPERVISOR'::funcao_usuario AND 
   equipe_id IN (SELECT equipe_id FROM public.usuarios WHERE id = get_usuario_atual())) OR
  (id = get_usuario_atual())
);

-- Nova política para supervisores de equipe verem apenas sua equipe
CREATE POLICY "Supervisores de equipe podem ver sua equipe" 
ON public.usuarios 
FOR SELECT 
USING (
  (get_funcao_usuario() = 'SUPERVISOR_EQUIPE'::funcao_usuario AND 
   equipe_id = (SELECT equipe_id FROM public.usuarios WHERE id = get_usuario_atual())) OR
  (id = get_usuario_atual())
);

-- Vendedores podem ver apenas próprio perfil (recriar)
CREATE POLICY "Vendedores podem ver apenas próprio perfil" 
ON public.usuarios 
FOR SELECT 
USING (
  get_funcao_usuario() = 'VENDEDOR'::funcao_usuario AND 
  id = get_usuario_atual()
);

-- Políticas de inserção para usuarios
DROP POLICY IF EXISTS "Administradores podem inserir usuários" ON public.usuarios;

CREATE POLICY "Administradores podem inserir qualquer usuário" 
ON public.usuarios 
FOR INSERT 
WITH CHECK (get_funcao_usuario() = 'ADMINISTRADOR_GERAL'::funcao_usuario);

CREATE POLICY "Supervisores podem inserir vendedores e supervisores de equipe" 
ON public.usuarios 
FOR INSERT 
WITH CHECK (
  get_funcao_usuario() = 'SUPERVISOR'::funcao_usuario AND 
  funcao IN ('VENDEDOR'::funcao_usuario, 'SUPERVISOR_EQUIPE'::funcao_usuario)
);

CREATE POLICY "Supervisores de equipe podem inserir vendedores" 
ON public.usuarios 
FOR INSERT 
WITH CHECK (
  get_funcao_usuario() = 'SUPERVISOR_EQUIPE'::funcao_usuario AND 
  funcao = 'VENDEDOR'::funcao_usuario AND
  equipe_id = (SELECT equipe_id FROM public.usuarios WHERE id = get_usuario_atual())
);

-- Políticas de atualização para usuarios
DROP POLICY IF EXISTS "Administradores podem atualizar usuários" ON public.usuarios;
DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON public.usuarios;

CREATE POLICY "Administradores podem atualizar qualquer usuário" 
ON public.usuarios 
FOR UPDATE 
USING (get_funcao_usuario() = 'ADMINISTRADOR_GERAL'::funcao_usuario);

CREATE POLICY "Supervisores podem atualizar sua equipe" 
ON public.usuarios 
FOR UPDATE 
USING (
  (get_funcao_usuario() = 'SUPERVISOR'::funcao_usuario AND 
   equipe_id IN (SELECT equipe_id FROM public.usuarios WHERE id = get_usuario_atual())) OR
  (id = get_usuario_atual())
);

CREATE POLICY "Supervisores de equipe podem atualizar sua equipe" 
ON public.usuarios 
FOR UPDATE 
USING (
  (get_funcao_usuario() = 'SUPERVISOR_EQUIPE'::funcao_usuario AND 
   equipe_id = (SELECT equipe_id FROM public.usuarios WHERE id = get_usuario_atual())) OR
  (id = get_usuario_atual())
);

CREATE POLICY "Vendedores podem atualizar próprio perfil" 
ON public.usuarios 
FOR UPDATE 
USING (
  get_funcao_usuario() = 'VENDEDOR'::funcao_usuario AND 
  id = get_usuario_atual()
);

-- Trigger para updated_at na tabela equipes
CREATE TRIGGER update_equipes_updated_at
BEFORE UPDATE ON public.equipes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir equipe padrão
INSERT INTO public.equipes (nome, descricao) 
VALUES ('Equipe Principal', 'Equipe principal da empresa');