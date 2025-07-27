-- Criando banco de dados do zero para CRM de Vendas de Telecom

-- 1. Remover estruturas existentes
DROP TABLE IF EXISTS public.vendas CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.status_venda CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.get_current_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_company() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;

-- 2. Criar ENUMs
CREATE TYPE public.funcao_usuario AS ENUM (
  'ADMINISTRADOR_GERAL',
  'SUPERVISOR', 
  'VENDEDOR'
);

CREATE TYPE public.status_venda AS ENUM (
  'gerada',
  'em_andamento',
  'aprovada',
  'perdida'
);

CREATE TYPE public.tipo_documento AS ENUM (
  'documento_cliente_frente',
  'documento_cliente_verso',
  'comprovante_endereco',
  'fachada_casa'
);

-- 3. Criar tabela de usuários
CREATE TABLE public.usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  cpf TEXT NOT NULL UNIQUE,
  funcao funcao_usuario NOT NULL DEFAULT 'VENDEDOR',
  data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Criar tabela de endereços
CREATE TABLE public.enderecos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cep TEXT NOT NULL,
  logradouro TEXT NOT NULL,
  numero TEXT NOT NULL,
  complemento TEXT,
  bairro TEXT NOT NULL,
  localidade TEXT NOT NULL,
  uf TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Criar tabela de clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  cpf TEXT NOT NULL,
  data_nascimento DATE,
  endereco_id UUID REFERENCES public.enderecos(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Criar tabela de vendas
CREATE TABLE public.vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  vendedor_id UUID NOT NULL REFERENCES public.usuarios(id),
  vendedor_nome TEXT NOT NULL,
  status status_venda DEFAULT 'gerada',
  data_venda DATE DEFAULT CURRENT_DATE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. Criar tabela de documentos
CREATE TABLE public.documentos_venda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  tipo tipo_documento NOT NULL,
  nome_arquivo TEXT NOT NULL,
  tamanho INTEGER NOT NULL,
  tipo_mime TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  data_upload TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. Criar tabela de histórico de vendas
CREATE TABLE public.historico_vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  status_anterior status_venda,
  status_novo status_venda NOT NULL,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id),
  observacao TEXT,
  data_alteracao TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. Habilitar RLS em todas as tabelas
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enderecos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_vendas ENABLE ROW LEVEL SECURITY;

-- 10. Criar funções de segurança
CREATE OR REPLACE FUNCTION public.get_usuario_atual()
RETURNS UUID
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT id FROM public.usuarios WHERE email = auth.email();
$$;

CREATE OR REPLACE FUNCTION public.get_funcao_usuario(user_id UUID DEFAULT public.get_usuario_atual())
RETURNS funcao_usuario
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT funcao FROM public.usuarios WHERE id = user_id;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_supervisor()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT get_funcao_usuario() IN ('ADMINISTRADOR_GERAL', 'SUPERVISOR');
$$;

-- 11. Criar políticas RLS para usuários
CREATE POLICY "Administradores podem ver todos os usuários"
ON public.usuarios FOR SELECT
USING (get_funcao_usuario() = 'ADMINISTRADOR_GERAL');

CREATE POLICY "Supervisores podem ver vendedores"
ON public.usuarios FOR SELECT
USING (
  get_funcao_usuario() = 'SUPERVISOR' 
  AND (funcao = 'VENDEDOR' OR id = get_usuario_atual())
);

CREATE POLICY "Vendedores podem ver apenas próprio perfil"
ON public.usuarios FOR SELECT
USING (id = get_usuario_atual());

CREATE POLICY "Administradores podem inserir usuários"
ON public.usuarios FOR INSERT
WITH CHECK (get_funcao_usuario() = 'ADMINISTRADOR_GERAL');

CREATE POLICY "Administradores podem atualizar usuários"
ON public.usuarios FOR UPDATE
USING (get_funcao_usuario() = 'ADMINISTRADOR_GERAL');

CREATE POLICY "Usuários podem atualizar próprio perfil"
ON public.usuarios FOR UPDATE
USING (id = get_usuario_atual());

-- 12. Criar políticas RLS para vendas
CREATE POLICY "Admins e supervisores veem todas as vendas"
ON public.vendas FOR SELECT
USING (is_admin_or_supervisor());

CREATE POLICY "Vendedores veem apenas suas vendas"
ON public.vendas FOR SELECT
USING (vendedor_id = get_usuario_atual());

CREATE POLICY "Todos podem inserir vendas"
ON public.vendas FOR INSERT
WITH CHECK (vendedor_id = get_usuario_atual());

CREATE POLICY "Admins e supervisores podem atualizar vendas"
ON public.vendas FOR UPDATE
USING (is_admin_or_supervisor());

CREATE POLICY "Vendedores podem atualizar suas vendas"
ON public.vendas FOR UPDATE
USING (vendedor_id = get_usuario_atual());

-- 13. Criar políticas RLS para clientes (seguem as vendas)
CREATE POLICY "Acesso baseado em vendas - SELECT"
ON public.clientes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.vendas 
    WHERE cliente_id = clientes.id 
    AND (
      is_admin_or_supervisor() 
      OR vendedor_id = get_usuario_atual()
    )
  )
);

CREATE POLICY "Todos podem inserir clientes"
ON public.clientes FOR INSERT
WITH CHECK (true);

CREATE POLICY "Acesso baseado em vendas - UPDATE"
ON public.clientes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.vendas 
    WHERE cliente_id = clientes.id 
    AND (
      is_admin_or_supervisor() 
      OR vendedor_id = get_usuario_atual()
    )
  )
);

-- 14. Criar políticas RLS para endereços (seguem os clientes)
CREATE POLICY "Acesso via clientes"
ON public.enderecos FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.clientes c
    JOIN public.vendas v ON v.cliente_id = c.id
    WHERE c.endereco_id = enderecos.id
    AND (
      is_admin_or_supervisor() 
      OR v.vendedor_id = get_usuario_atual()
    )
  )
);

-- 15. Criar políticas RLS para documentos (seguem as vendas)
CREATE POLICY "Acesso via vendas"
ON public.documentos_venda FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.vendas 
    WHERE id = documentos_venda.venda_id 
    AND (
      is_admin_or_supervisor() 
      OR vendedor_id = get_usuario_atual()
    )
  )
);

-- 16. Criar políticas RLS para histórico (seguem as vendas)
CREATE POLICY "Acesso via vendas - histórico"
ON public.historico_vendas FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.vendas 
    WHERE id = historico_vendas.venda_id 
    AND (
      is_admin_or_supervisor() 
      OR vendedor_id = get_usuario_atual()
    )
  )
);

-- 17. Criar triggers para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_usuarios_updated_at
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendas_updated_at
  BEFORE UPDATE ON public.vendas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 18. Criar trigger para histórico automático
CREATE OR REPLACE FUNCTION public.registrar_mudanca_status()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_historico_vendas
  AFTER UPDATE ON public.vendas
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_mudanca_status();

-- 19. Inserir usuário administrador padrão
INSERT INTO public.usuarios (
  nome,
  telefone,
  email,
  cpf,
  funcao
) VALUES (
  'ADMINISTRADOR SISTEMA',
  '(11) 99999-9999',
  'admin@sistema.com',
  '000.000.000-00',
  'ADMINISTRADOR_GERAL'
);

-- 20. Criar bucket para documentos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documentos-vendas', 'documentos-vendas', false);

-- 21. Criar políticas para storage
CREATE POLICY "Usuários podem ver documentos de suas vendas"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documentos-vendas' 
  AND EXISTS (
    SELECT 1 FROM public.documentos_venda dv
    JOIN public.vendas v ON v.id = dv.venda_id
    WHERE dv.storage_path = name
    AND (
      is_admin_or_supervisor() 
      OR v.vendedor_id = get_usuario_atual()
    )
  )
);

CREATE POLICY "Usuários podem fazer upload de documentos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documentos-vendas'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Usuários podem atualizar documentos de suas vendas"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documentos-vendas' 
  AND EXISTS (
    SELECT 1 FROM public.documentos_venda dv
    JOIN public.vendas v ON v.id = dv.venda_id
    WHERE dv.storage_path = name
    AND (
      is_admin_or_supervisor() 
      OR v.vendedor_id = get_usuario_atual()
    )
  )
);

CREATE POLICY "Usuários podem deletar documentos de suas vendas"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documentos-vendas' 
  AND EXISTS (
    SELECT 1 FROM public.documentos_venda dv
    JOIN public.vendas v ON v.id = dv.venda_id
    WHERE dv.storage_path = name
    AND (
      is_admin_or_supervisor() 
      OR v.vendedor_id = get_usuario_atual()
    )
  )
);