-- 4. Recriar políticas RLS das vendas com lógica baseada em email
DROP POLICY IF EXISTS "Admins e supervisores veem todas as vendas" ON public.vendas;
DROP POLICY IF EXISTS "Vendedores veem apenas suas vendas" ON public.vendas;
DROP POLICY IF EXISTS "Todos podem inserir vendas" ON public.vendas;
DROP POLICY IF EXISTS "Admins e supervisores podem atualizar vendas" ON public.vendas;
DROP POLICY IF EXISTS "Vendedores podem atualizar suas vendas" ON public.vendas;

-- Política de SELECT para vendas (baseada em email)
CREATE POLICY "vendas_select_por_email" ON public.vendas
FOR SELECT USING (
  -- Admin/Supervisor vê tudo
  EXISTS(
    SELECT 1 FROM public.usuarios 
    WHERE email = auth.email() 
    AND ativo = true 
    AND funcao IN ('ADMINISTRADOR_GERAL', 'SUPERVISOR')
  )
  OR
  -- Vendedor vê apenas suas vendas
  EXISTS(
    SELECT 1 FROM public.usuarios 
    WHERE email = auth.email() 
    AND ativo = true 
    AND id = vendas.vendedor_id
  )
);

-- Política de INSERT para vendas (baseada em email)
CREATE POLICY "vendas_insert_por_email" ON public.vendas
FOR INSERT WITH CHECK (
  EXISTS(
    SELECT 1 FROM public.usuarios 
    WHERE email = auth.email() 
    AND ativo = true 
    AND id = vendas.vendedor_id
  )
);

-- Política de UPDATE para vendas (baseada em email)
CREATE POLICY "vendas_update_por_email" ON public.vendas
FOR UPDATE USING (
  -- Admin/Supervisor pode atualizar tudo
  EXISTS(
    SELECT 1 FROM public.usuarios 
    WHERE email = auth.email() 
    AND ativo = true 
    AND funcao IN ('ADMINISTRADOR_GERAL', 'SUPERVISOR')
  )
  OR
  -- Vendedor pode atualizar suas vendas
  EXISTS(
    SELECT 1 FROM public.usuarios 
    WHERE email = auth.email() 
    AND ativo = true 
    AND id = vendas.vendedor_id
  )
);