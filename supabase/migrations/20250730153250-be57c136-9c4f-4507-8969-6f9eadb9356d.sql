-- Corrigir as políticas RLS da tabela enderecos
-- Primeiro, remover as políticas existentes
DROP POLICY IF EXISTS "enderecos_insert_authenticated" ON public.enderecos;
DROP POLICY IF EXISTS "enderecos_select_via_vendas" ON public.enderecos;
DROP POLICY IF EXISTS "enderecos_update_via_vendas" ON public.enderecos;

-- Criar política de INSERT mais robusta que funciona para usuários autenticados
CREATE POLICY "enderecos_insert_for_authenticated_users" 
ON public.enderecos 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Criar política de SELECT que permite acesso baseado em vendas
CREATE POLICY "enderecos_select_via_vendas" 
ON public.enderecos 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM clientes c 
    JOIN vendas v ON v.cliente_id = c.id 
    WHERE c.endereco_id = enderecos.id 
    AND (
      auth.uid() IN (
        SELECT id FROM usuarios WHERE funcao IN ('ADMINISTRADOR_GERAL', 'SUPERVISOR') AND ativo = true
      ) 
      OR v.vendedor_id = auth.uid()
    )
  )
);

-- Criar política de UPDATE que permite acesso baseado em vendas
CREATE POLICY "enderecos_update_via_vendas" 
ON public.enderecos 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM clientes c 
    JOIN vendas v ON v.cliente_id = c.id 
    WHERE c.endereco_id = enderecos.id 
    AND (
      auth.uid() IN (
        SELECT id FROM usuarios WHERE funcao IN ('ADMINISTRADOR_GERAL', 'SUPERVISOR') AND ativo = true
      ) 
      OR v.vendedor_id = auth.uid()
    )
  )
);

-- Garantir que a tabela enderecos tenha RLS habilitado
ALTER TABLE public.enderecos ENABLE ROW LEVEL SECURITY;