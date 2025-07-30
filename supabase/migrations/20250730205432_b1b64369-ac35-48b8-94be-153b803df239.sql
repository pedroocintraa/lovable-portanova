-- 6. Recriar políticas RLS dos endereços com lógica baseada em email
DROP POLICY IF EXISTS "enderecos_select_via_vendas" ON public.enderecos;
DROP POLICY IF EXISTS "enderecos_update_via_vendas" ON public.enderecos;
DROP POLICY IF EXISTS "enderecos_insert_authenticated_robust" ON public.enderecos;

-- Política de SELECT para endereços (baseada em email)
CREATE POLICY "enderecos_select_por_email" ON public.enderecos
FOR SELECT USING (
  EXISTS(
    SELECT 1 FROM clientes c
    JOIN vendas v ON v.cliente_id = c.id
    JOIN public.usuarios u ON u.id = v.vendedor_id
    WHERE c.endereco_id = enderecos.id
    AND u.email = auth.email()
    AND u.ativo = true
    AND (
      u.funcao IN ('ADMINISTRADOR_GERAL', 'SUPERVISOR')
      OR u.id = v.vendedor_id
    )
  )
);

-- Política de INSERT para endereços (baseada em email)
CREATE POLICY "enderecos_insert_por_email" ON public.enderecos
FOR INSERT WITH CHECK (
  EXISTS(
    SELECT 1 FROM public.usuarios 
    WHERE email = auth.email() 
    AND ativo = true
  )
);

-- Política de UPDATE para endereços (baseada em email)
CREATE POLICY "enderecos_update_por_email" ON public.enderecos
FOR UPDATE USING (
  EXISTS(
    SELECT 1 FROM clientes c
    JOIN vendas v ON v.cliente_id = c.id
    JOIN public.usuarios u ON u.id = v.vendedor_id
    WHERE c.endereco_id = enderecos.id
    AND u.email = auth.email()
    AND u.ativo = true
    AND (
      u.funcao IN ('ADMINISTRADOR_GERAL', 'SUPERVISOR')
      OR u.id = v.vendedor_id
    )
  )
);