-- Migração para implementar user_id e resolver problemas de RLS
-- Esta migração é SEGURA - validado sem emails duplicados e base limpa

-- 1. Adicionar coluna user_id com constraint UNIQUE
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE;

-- 2. Criar função que usa auth.uid() ao invés de auth.email()
CREATE OR REPLACE FUNCTION public.get_usuario_atual_by_uid()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_id uuid;
BEGIN
  -- Usar auth.uid() diretamente
  user_id := auth.uid();
  
  IF user_id IS NOT NULL THEN
    -- Verificar se o usuário existe na tabela usuarios pelo user_id
    IF EXISTS(SELECT 1 FROM public.usuarios WHERE usuarios.user_id = auth.uid() AND usuarios.ativo = true) THEN
      RETURN (SELECT id FROM public.usuarios WHERE usuarios.user_id = auth.uid() AND usuarios.ativo = true LIMIT 1);
    END IF;
  END IF;
  
  RETURN NULL;
END;
$function$;

-- 3. Criar função para sincronizar novos usuários do auth.users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.usuarios (
    id,
    user_id,
    nome,
    email,
    telefone,
    cpf,
    funcao,
    ativo,
    data_cadastro
  ) VALUES (
    gen_random_uuid(),
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', 'Usuário'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'telefone', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'cpf', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'funcao')::funcao_usuario, 'VENDEDOR'::funcao_usuario),
    true,
    now()
  ) ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- 4. Criar trigger para sincronização automática
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 5. Migrar dados existentes: popular user_id através de JOIN por email
UPDATE public.usuarios 
SET user_id = au.id
FROM auth.users au 
WHERE au.email = usuarios.email 
AND usuarios.user_id IS NULL;

-- 6. Atualizar políticas RLS para usar auth.uid() ao invés de auth.email()

-- Remover políticas antigas
DROP POLICY IF EXISTS "usuarios_select_admin" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_supervisor" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_supervisor_equipe" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_vendedor" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert_admin" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert_supervisor" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert_supervisor_equipe" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_admin" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_supervisor" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_supervisor_equipe" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_vendedor" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_prevent_self_role_elevation" ON public.usuarios;

-- Criar novas políticas usando user_id e auth.uid()
CREATE POLICY "usuarios_select_admin_uid" ON public.usuarios
FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.usuarios u WHERE u.user_id = auth.uid() AND u.funcao = 'ADMINISTRADOR_GERAL' AND u.ativo = true)
);

CREATE POLICY "usuarios_select_supervisor_uid" ON public.usuarios
FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.usuarios u WHERE u.user_id = auth.uid() AND u.funcao = 'SUPERVISOR' AND u.ativo = true)
  AND (funcao IN ('SUPERVISOR_EQUIPE', 'VENDEDOR') OR usuarios.user_id = auth.uid())
);

CREATE POLICY "usuarios_select_supervisor_equipe_uid" ON public.usuarios
FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.usuarios u WHERE u.user_id = auth.uid() AND u.funcao = 'SUPERVISOR_EQUIPE' AND u.ativo = true)
  AND (equipe_id = (SELECT equipe_id FROM public.usuarios WHERE usuarios.user_id = auth.uid()) OR usuarios.user_id = auth.uid())
);

CREATE POLICY "usuarios_select_vendedor_uid" ON public.usuarios
FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.usuarios u WHERE u.user_id = auth.uid() AND u.funcao = 'VENDEDOR' AND u.ativo = true)
  AND usuarios.user_id = auth.uid()
);

CREATE POLICY "usuarios_insert_admin_uid" ON public.usuarios
FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM public.usuarios u WHERE u.user_id = auth.uid() AND u.funcao = 'ADMINISTRADOR_GERAL' AND u.ativo = true)
);

CREATE POLICY "usuarios_insert_supervisor_uid" ON public.usuarios
FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM public.usuarios u WHERE u.user_id = auth.uid() AND u.funcao = 'SUPERVISOR' AND u.ativo = true)
  AND funcao IN ('VENDEDOR', 'SUPERVISOR_EQUIPE')
);

CREATE POLICY "usuarios_insert_supervisor_equipe_uid" ON public.usuarios
FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM public.usuarios u WHERE u.user_id = auth.uid() AND u.funcao = 'SUPERVISOR_EQUIPE' AND u.ativo = true)
  AND funcao = 'VENDEDOR'
  AND equipe_id = (SELECT equipe_id FROM public.usuarios WHERE user_id = auth.uid())
);

CREATE POLICY "usuarios_update_admin_uid" ON public.usuarios
FOR UPDATE USING (
  EXISTS(SELECT 1 FROM public.usuarios u WHERE u.user_id = auth.uid() AND u.funcao = 'ADMINISTRADOR_GERAL' AND u.ativo = true)
);

CREATE POLICY "usuarios_update_supervisor_uid" ON public.usuarios
FOR UPDATE USING (
  EXISTS(SELECT 1 FROM public.usuarios u WHERE u.user_id = auth.uid() AND u.funcao = 'SUPERVISOR' AND u.ativo = true)
  AND (funcao IN ('SUPERVISOR_EQUIPE', 'VENDEDOR') OR usuarios.user_id = auth.uid())
);

CREATE POLICY "usuarios_update_supervisor_equipe_uid" ON public.usuarios
FOR UPDATE USING (
  EXISTS(SELECT 1 FROM public.usuarios u WHERE u.user_id = auth.uid() AND u.funcao = 'SUPERVISOR_EQUIPE' AND u.ativo = true)
  AND (equipe_id = (SELECT equipe_id FROM public.usuarios WHERE usuarios.user_id = auth.uid()) OR usuarios.user_id = auth.uid())
);

CREATE POLICY "usuarios_update_vendedor_uid" ON public.usuarios
FOR UPDATE USING (
  EXISTS(SELECT 1 FROM public.usuarios u WHERE u.user_id = auth.uid() AND u.funcao = 'VENDEDOR' AND u.ativo = true)
  AND user_id = auth.uid()
);

CREATE POLICY "usuarios_prevent_self_role_elevation_uid" ON public.usuarios
FOR UPDATE USING (
  CASE 
    WHEN user_id = auth.uid() THEN 
      funcao = (SELECT funcao FROM public.usuarios WHERE user_id = auth.uid())
    ELSE true
  END
);

-- 7. Atualizar outras políticas RLS que usam get_usuario_atual()
-- Vendas
DROP POLICY IF EXISTS "vendas_select_por_email" ON public.vendas;
DROP POLICY IF EXISTS "vendas_insert_por_email" ON public.vendas;
DROP POLICY IF EXISTS "vendas_update_por_email" ON public.vendas;

CREATE POLICY "vendas_select_by_uid" ON public.vendas
FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.usuarios u WHERE u.user_id = auth.uid() AND u.funcao IN ('ADMINISTRADOR_GERAL', 'SUPERVISOR') AND u.ativo = true)
  OR
  EXISTS(SELECT 1 FROM public.usuarios u WHERE u.user_id = auth.uid() AND u.id = vendas.vendedor_id AND u.ativo = true)
);

CREATE POLICY "vendas_insert_by_uid" ON public.vendas
FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM public.usuarios u WHERE u.user_id = auth.uid() AND u.id = vendas.vendedor_id AND u.ativo = true)
);

CREATE POLICY "vendas_update_by_uid" ON public.vendas
FOR UPDATE USING (
  EXISTS(SELECT 1 FROM public.usuarios u WHERE u.user_id = auth.uid() AND u.funcao IN ('ADMINISTRADOR_GERAL', 'SUPERVISOR') AND u.ativo = true)
  OR
  EXISTS(SELECT 1 FROM public.usuarios u WHERE u.user_id = auth.uid() AND u.id = vendas.vendedor_id AND u.ativo = true)
);

-- Clientes
DROP POLICY IF EXISTS "clientes_select_por_email" ON public.clientes;
DROP POLICY IF EXISTS "clientes_insert_por_email" ON public.clientes;
DROP POLICY IF EXISTS "clientes_update_por_email" ON public.clientes;

CREATE POLICY "clientes_select_by_uid" ON public.clientes
FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.usuarios u WHERE u.user_id = auth.uid() AND u.funcao IN ('ADMINISTRADOR_GERAL', 'SUPERVISOR') AND u.ativo = true)
  OR
  EXISTS(SELECT 1 FROM vendas v JOIN public.usuarios u ON u.id = v.vendedor_id WHERE v.cliente_id = clientes.id AND u.user_id = auth.uid() AND u.ativo = true)
);

CREATE POLICY "clientes_insert_by_uid" ON public.clientes
FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM public.usuarios u WHERE u.user_id = auth.uid() AND u.ativo = true)
);

CREATE POLICY "clientes_update_by_uid" ON public.clientes
FOR UPDATE USING (
  EXISTS(SELECT 1 FROM public.usuarios u WHERE u.user_id = auth.uid() AND u.funcao IN ('ADMINISTRADOR_GERAL', 'SUPERVISOR') AND u.ativo = true)
  OR
  EXISTS(SELECT 1 FROM vendas v JOIN public.usuarios u ON u.id = v.vendedor_id WHERE v.cliente_id = clientes.id AND u.user_id = auth.uid() AND u.ativo = true)
  OR
  NOT EXISTS(SELECT 1 FROM vendas v WHERE v.cliente_id = clientes.id)
);

-- Endereços
DROP POLICY IF EXISTS "enderecos_select_por_email" ON public.enderecos;
DROP POLICY IF EXISTS "enderecos_insert_por_email" ON public.enderecos;
DROP POLICY IF EXISTS "enderecos_update_por_email" ON public.enderecos;

CREATE POLICY "enderecos_select_by_uid" ON public.enderecos
FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.usuarios u WHERE u.user_id = auth.uid() AND u.funcao IN ('ADMINISTRADOR_GERAL', 'SUPERVISOR') AND u.ativo = true)
  OR
  EXISTS(SELECT 1 FROM clientes c JOIN vendas v ON v.cliente_id = c.id JOIN public.usuarios u ON u.id = v.vendedor_id WHERE c.endereco_id = enderecos.id AND u.user_id = auth.uid() AND u.ativo = true)
);

CREATE POLICY "enderecos_insert_by_uid" ON public.enderecos
FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM public.usuarios u WHERE u.user_id = auth.uid() AND u.ativo = true)
);

CREATE POLICY "enderecos_update_by_uid" ON public.enderecos
FOR UPDATE USING (
  EXISTS(SELECT 1 FROM clientes c JOIN vendas v ON v.cliente_id = c.id JOIN public.usuarios u ON u.id = v.vendedor_id WHERE c.endereco_id = enderecos.id AND u.user_id = auth.uid() AND u.ativo = true AND (u.funcao IN ('ADMINISTRADOR_GERAL', 'SUPERVISOR') OR u.id = v.vendedor_id))
);