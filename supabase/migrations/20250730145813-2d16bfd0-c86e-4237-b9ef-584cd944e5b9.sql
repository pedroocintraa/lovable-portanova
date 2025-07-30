-- Remover a política RLS atual que está causando o problema
DROP POLICY IF EXISTS "Acesso via clientes" ON public.enderecos;

-- Criar políticas específicas por operação
-- Política para INSERT: permitir que usuários autenticados criem novos endereços
CREATE POLICY "enderecos_insert_authenticated" 
ON public.enderecos 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Política para SELECT: permitir acesso via vendas existentes
CREATE POLICY "enderecos_select_via_vendas" 
ON public.enderecos 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1
    FROM (clientes c JOIN vendas v ON (v.cliente_id = c.id))
    WHERE (c.endereco_id = enderecos.id) 
    AND (is_admin_or_supervisor() OR (v.vendedor_id = get_usuario_atual()))
  )
);

-- Política para UPDATE: permitir atualização via vendas existentes
CREATE POLICY "enderecos_update_via_vendas" 
ON public.enderecos 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1
    FROM (clientes c JOIN vendas v ON (v.cliente_id = c.id))
    WHERE (c.endereco_id = enderecos.id) 
    AND (is_admin_or_supervisor() OR (v.vendedor_id = get_usuario_atual()))
  )
);