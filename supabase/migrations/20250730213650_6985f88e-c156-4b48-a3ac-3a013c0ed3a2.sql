-- Corrigir RLS policies para permitir o fluxo de cadastro de vendas
-- Removendo dependência circular nas policies de clientes e endereços

-- 1. Atualizar policy de SELECT para clientes 
DROP POLICY IF EXISTS "clientes_select_por_email" ON public.clientes;

CREATE POLICY "clientes_select_por_email" ON public.clientes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM usuarios u 
    WHERE u.email = auth.email() 
    AND u.ativo = true 
    AND (
      u.funcao = ANY(ARRAY['ADMINISTRADOR_GERAL'::funcao_usuario, 'SUPERVISOR'::funcao_usuario])
      OR EXISTS (
        SELECT 1 FROM vendas v 
        WHERE v.cliente_id = clientes.id 
        AND v.vendedor_id = u.id
      )
    )
  )
);

-- 2. Atualizar policy de SELECT para endereços
DROP POLICY IF EXISTS "enderecos_select_por_email" ON public.enderecos;

CREATE POLICY "enderecos_select_por_email" ON public.enderecos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM usuarios u 
    WHERE u.email = auth.email() 
    AND u.ativo = true 
    AND (
      u.funcao = ANY(ARRAY['ADMINISTRADOR_GERAL'::funcao_usuario, 'SUPERVISOR'::funcao_usuario])
      OR EXISTS (
        SELECT 1 FROM clientes c 
        JOIN vendas v ON v.cliente_id = c.id
        WHERE c.endereco_id = enderecos.id 
        AND v.vendedor_id = u.id
      )
    )
  )
);

-- 3. Adicionar policy específica para UPDATE de clientes (relacionar endereço)
DROP POLICY IF EXISTS "clientes_update_por_email" ON public.clientes;

CREATE POLICY "clientes_update_por_email" ON public.clientes  
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM usuarios u 
    WHERE u.email = auth.email() 
    AND u.ativo = true 
    AND (
      u.funcao = ANY(ARRAY['ADMINISTRADOR_GERAL'::funcao_usuario, 'SUPERVISOR'::funcao_usuario])
      OR EXISTS (
        SELECT 1 FROM vendas v 
        WHERE v.cliente_id = clientes.id 
        AND v.vendedor_id = u.id
      )
      -- Permitir update durante inserção (quando ainda não existe venda)
      OR NOT EXISTS (SELECT 1 FROM vendas v WHERE v.cliente_id = clientes.id)
    )
  )
);