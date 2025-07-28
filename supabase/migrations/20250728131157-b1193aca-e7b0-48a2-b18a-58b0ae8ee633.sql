-- Passo 1: Atualizar funções security definer sem deletar (substituir)
CREATE OR REPLACE FUNCTION public.get_usuario_atual()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM public.usuarios WHERE email = auth.email() AND ativo = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_funcao_usuario(user_id uuid DEFAULT get_usuario_atual())
RETURNS funcao_usuario
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT funcao FROM public.usuarios WHERE id = user_id AND ativo = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_supervisor()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT get_funcao_usuario() IN ('ADMINISTRADOR_GERAL', 'SUPERVISOR');
$$;

-- Passo 2: Adicionar foreign keys corretas (apenas se não existirem)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'usuarios_equipe_id_fkey'
    ) THEN
        ALTER TABLE public.usuarios 
        ADD CONSTRAINT usuarios_equipe_id_fkey 
        FOREIGN KEY (equipe_id) REFERENCES public.equipes(id);
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'usuarios_supervisor_equipe_id_fkey'
    ) THEN
        ALTER TABLE public.usuarios 
        ADD CONSTRAINT usuarios_supervisor_equipe_id_fkey 
        FOREIGN KEY (supervisor_equipe_id) REFERENCES public.usuarios(id);
    END IF;
END$$;

-- Passo 3: Criar política temporária mais permissiva para desenvolvimento
-- Permitir administradores criarem equipes sem problemas de autenticação
DROP POLICY IF EXISTS "Administradores podem gerenciar equipes" ON public.equipes;

CREATE POLICY "Administradores podem gerenciar equipes" 
ON public.equipes 
FOR ALL 
USING (
  -- Temporariamente mais permissivo para desenvolvimento
  (get_funcao_usuario() = 'ADMINISTRADOR_GERAL'::funcao_usuario) OR
  (auth.email() = 'admin@teste.com')
)
WITH CHECK (
  (get_funcao_usuario() = 'ADMINISTRADOR_GERAL'::funcao_usuario) OR
  (auth.email() = 'admin@teste.com')
);

-- Inserir usuário admin de teste se não existir
INSERT INTO public.usuarios (nome, telefone, email, cpf, funcao) 
VALUES ('ADMIN TESTE', '11999999999', 'admin@teste.com', '11111111111', 'ADMINISTRADOR_GERAL'::funcao_usuario)
ON CONFLICT (email) DO NOTHING;