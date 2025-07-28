-- Criando tabelas para configurações de planos e datas de vencimento
-- e adicionando novos campos na tabela vendas

-- 1. Criar tabela de planos
CREATE TABLE public.planos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  valor DECIMAL(10,2),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Criar tabela de datas de vencimento
CREATE TABLE public.datas_vencimento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dias INTEGER NOT NULL,
  descricao TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Adicionar novo tipo de documento para selfie
ALTER TYPE tipo_documento ADD VALUE 'selfie_cliente';

-- 4. Adicionar novos campos na tabela vendas
ALTER TABLE public.vendas 
ADD COLUMN data_vencimento DATE,
ADD COLUMN plano_id UUID REFERENCES public.planos(id);

-- 5. Habilitar RLS nas novas tabelas
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datas_vencimento ENABLE ROW LEVEL SECURITY;

-- 6. Criar políticas RLS para planos
CREATE POLICY "Administradores podem gerenciar planos" 
ON public.planos 
FOR ALL 
USING (get_funcao_usuario() = 'ADMINISTRADOR_GERAL'::funcao_usuario);

CREATE POLICY "Todos podem visualizar planos ativos" 
ON public.planos 
FOR SELECT 
USING (ativo = true);

-- 7. Criar políticas RLS para datas de vencimento
CREATE POLICY "Administradores podem gerenciar datas de vencimento" 
ON public.datas_vencimento 
FOR ALL 
USING (get_funcao_usuario() = 'ADMINISTRADOR_GERAL'::funcao_usuario);

CREATE POLICY "Todos podem visualizar datas de vencimento ativas" 
ON public.datas_vencimento 
FOR SELECT 
USING (ativo = true);

-- 8. Adicionar triggers para updated_at
CREATE TRIGGER update_planos_updated_at
  BEFORE UPDATE ON public.planos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_datas_vencimento_updated_at
  BEFORE UPDATE ON public.datas_vencimento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Inserir alguns dados padrão
INSERT INTO public.planos (nome, descricao, valor) VALUES
('Básico', 'Plano básico com funcionalidades essenciais', 99.90),
('Intermediário', 'Plano intermediário com mais recursos', 199.90),
('Avançado', 'Plano avançado com todos os recursos', 299.90);

INSERT INTO public.datas_vencimento (dias, descricao) VALUES
(30, '30 dias'),
(60, '60 dias'),
(90, '90 dias'),
(120, '120 dias');