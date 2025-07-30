-- CORREÇÃO DEFINITIVA: Modificar todas as políticas RLS para usar auth.email() diretamente
-- Isso elimina a dependência do auth.uid() problemático

-- 1. Atualizar get_usuario_atual para priorizar completamente auth.email()
CREATE OR REPLACE FUNCTION public.get_usuario_atual()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_id uuid;
  user_email text;
BEGIN
  -- PRIORIZAR auth.email() sobre auth.uid()
  user_email := auth.email();
  
  IF user_email IS NOT NULL THEN
    SELECT id INTO user_id
    FROM public.usuarios 
    WHERE email = user_email AND ativo = true 
    LIMIT 1;
    
    IF user_id IS NOT NULL THEN
      RETURN user_id;
    END IF;
  END IF;
  
  -- Fallback: tenta auth.uid() apenas se email falhou
  user_id := auth.uid();
  
  IF user_id IS NOT NULL THEN
    IF EXISTS(SELECT 1 FROM public.usuarios WHERE id = user_id AND ativo = true) THEN
      RETURN user_id;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$function$

-- 2. Criar função auxiliar baseada apenas em email
CREATE OR REPLACE FUNCTION public.get_usuario_por_email()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_id uuid;
  user_email text;
BEGIN
  user_email := auth.email();
  
  IF user_email IS NOT NULL THEN
    SELECT id INTO user_id
    FROM public.usuarios 
    WHERE email = user_email AND ativo = true 
    LIMIT 1;
    
    RETURN user_id;
  END IF;
  
  RETURN NULL;
END;
$function$

-- 3. Atualizar funções de permissão para usar email
CREATE OR REPLACE FUNCTION public.get_funcao_usuario_atual()
 RETURNS funcao_usuario
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT funcao FROM public.usuarios WHERE email = auth.email() AND ativo = true LIMIT 1;
$function$

CREATE OR REPLACE FUNCTION public.get_equipe_usuario_atual()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT equipe_id FROM public.usuarios WHERE email = auth.email() AND ativo = true LIMIT 1;
$function$

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT get_funcao_usuario_atual() = 'ADMINISTRADOR_GERAL';
$function$

CREATE OR REPLACE FUNCTION public.is_admin_or_supervisor()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT get_funcao_usuario_atual() IN ('ADMINISTRADOR_GERAL', 'SUPERVISOR');
$function$

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

-- 7. Atualizar função de debug para mostrar se a correção funcionou
CREATE OR REPLACE FUNCTION public.debug_auth_advanced()
 RETURNS TABLE(auth_uid uuid, auth_email text, jwt_claims jsonb, session_valid boolean, usuario_encontrado boolean, usuario_id uuid, usuario_nome text, usuario_funcao funcao_usuario, timestamp_check timestamp with time zone, get_usuario_atual_result uuid, get_usuario_por_email_result uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY SELECT 
    auth.uid() as auth_uid,
    auth.email() as auth_email,
    auth.jwt() as jwt_claims,
    (auth.email() IS NOT NULL) as session_valid,
    EXISTS(SELECT 1 FROM public.usuarios WHERE email = auth.email() AND ativo = true) as usuario_encontrado,
    (SELECT id FROM public.usuarios WHERE email = auth.email() AND ativo = true LIMIT 1) as usuario_id,
    (SELECT nome FROM public.usuarios WHERE email = auth.email() AND ativo = true LIMIT 1) as usuario_nome,
    (SELECT funcao FROM public.usuarios WHERE email = auth.email() AND ativo = true LIMIT 1) as usuario_funcao,
    now() as timestamp_check,
    get_usuario_atual() as get_usuario_atual_result,
    get_usuario_por_email() as get_usuario_por_email_result;
END;
$function$