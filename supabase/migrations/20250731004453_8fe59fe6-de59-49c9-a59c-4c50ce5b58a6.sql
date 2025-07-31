-- Recriar função get_usuario_atual() como wrapper para compatibilidade
CREATE OR REPLACE FUNCTION public.get_usuario_atual()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN get_usuario_atual_robusto();
END;
$$;

-- Recriar função debug_auth_context que estava faltando
CREATE OR REPLACE FUNCTION public.debug_auth_context()
RETURNS TABLE(auth_uid uuid, auth_email text, get_usuario_atual_result uuid, usuario_exists boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY SELECT 
    auth.uid() as auth_uid,
    auth.email() as auth_email,
    get_usuario_atual() as get_usuario_atual_result,
    EXISTS(SELECT 1 FROM public.usuarios WHERE usuarios.user_id = auth.uid() AND usuarios.ativo = true) as usuario_exists;
END;
$$;

-- Criar função get_funcao_usuario_atual para compatibilidade
CREATE OR REPLACE FUNCTION public.get_funcao_usuario_atual()
RETURNS funcao_usuario
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role funcao_usuario;
BEGIN
  SELECT funcao INTO user_role
  FROM public.usuarios 
  WHERE usuarios.user_id = auth.uid() AND usuarios.ativo = true
  LIMIT 1;
  
  RETURN user_role;
END;
$$;

-- Políticas para vendas (permitir atualização de status)
DROP POLICY IF EXISTS "vendas_update_by_uid" ON public.vendas;
CREATE POLICY "vendas_update_by_uid" ON public.vendas
FOR UPDATE USING (
  EXISTS(SELECT 1 FROM public.usuarios u WHERE u.user_id = auth.uid() AND u.funcao IN ('ADMINISTRADOR_GERAL', 'SUPERVISOR', 'SUPERVISOR_EQUIPE') AND u.ativo = true)
  OR
  EXISTS(SELECT 1 FROM public.usuarios u WHERE u.user_id = auth.uid() AND u.id = vendas.vendedor_id AND u.ativo = true)
);

-- Políticas para clientes (permitir atualização)
DROP POLICY IF EXISTS "clientes_update_by_uid" ON public.clientes;
CREATE POLICY "clientes_update_by_uid" ON public.clientes
FOR UPDATE USING (
  EXISTS(SELECT 1 FROM public.usuarios u WHERE u.user_id = auth.uid() AND u.funcao IN ('ADMINISTRADOR_GERAL', 'SUPERVISOR', 'SUPERVISOR_EQUIPE') AND u.ativo = true)
  OR
  EXISTS(SELECT 1 FROM public.vendas v WHERE v.cliente_id = clientes.id AND v.vendedor_id = (SELECT id FROM public.usuarios WHERE user_id = auth.uid()))
);

-- Políticas para enderecos (permitir atualização)
DROP POLICY IF EXISTS "enderecos_update_by_uid" ON public.enderecos;
CREATE POLICY "enderecos_update_by_uid" ON public.enderecos
FOR UPDATE USING (
  EXISTS(SELECT 1 FROM public.usuarios u WHERE u.user_id = auth.uid() AND u.funcao IN ('ADMINISTRADOR_GERAL', 'SUPERVISOR', 'SUPERVISOR_EQUIPE') AND u.ativo = true)
  OR
  EXISTS(SELECT 1 FROM public.clientes c WHERE c.endereco_id = enderecos.id AND c.id IN (SELECT cliente_id FROM public.vendas WHERE vendedor_id = (SELECT id FROM public.usuarios WHERE user_id = auth.uid())))
);