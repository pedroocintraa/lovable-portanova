-- 5. Recriar políticas RLS dos clientes com lógica baseada em email
DROP POLICY IF EXISTS "Acesso baseado em vendas - SELECT" ON public.clientes;
DROP POLICY IF EXISTS "Acesso baseado em vendas - UPDATE" ON public.clientes;
DROP POLICY IF EXISTS "Todos podem inserir clientes" ON public.clientes;

-- Política de SELECT para clientes (baseada em email)
CREATE POLICY "clientes_select_por_email" ON public.clientes
FOR SELECT USING (
  EXISTS(
    SELECT 1 FROM vendas v
    JOIN public.usuarios u ON u.id = v.vendedor_id
    WHERE v.cliente_id = clientes.id
    AND u.email = auth.email()
    AND u.ativo = true
    AND (
      u.funcao IN ('ADMINISTRADOR_GERAL', 'SUPERVISOR')
      OR u.id = v.vendedor_id
    )
  )
);

-- Política de INSERT para clientes (baseada em email)
CREATE POLICY "clientes_insert_por_email" ON public.clientes
FOR INSERT WITH CHECK (
  EXISTS(
    SELECT 1 FROM public.usuarios 
    WHERE email = auth.email() 
    AND ativo = true
  )
);

-- Política de UPDATE para clientes (baseada em email)
CREATE POLICY "clientes_update_por_email" ON public.clientes
FOR UPDATE USING (
  EXISTS(
    SELECT 1 FROM vendas v
    JOIN public.usuarios u ON u.id = v.vendedor_id
    WHERE v.cliente_id = clientes.id
    AND u.email = auth.email()
    AND u.ativo = true
    AND (
      u.funcao IN ('ADMINISTRADOR_GERAL', 'SUPERVISOR')
      OR u.id = v.vendedor_id
    )
  )
);