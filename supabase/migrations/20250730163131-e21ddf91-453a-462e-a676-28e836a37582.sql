-- Criar uma política RLS temporária mais permissiva para enderecos durante inserção
-- Esta política deve ser usada como fallback para resolver o problema de auth.uid() retornando null

-- Primeiro, remover a política existente que está causando problemas
DROP POLICY IF EXISTS "enderecos_insert_for_authenticated_users" ON public.enderecos;

-- Criar uma nova política mais robusta que verifica tanto auth.uid() quanto get_usuario_atual()
CREATE POLICY "enderecos_insert_authenticated_robust" 
ON public.enderecos 
FOR INSERT 
WITH CHECK (
  -- Verificar se há sessão autenticada de qualquer forma
  (auth.uid() IS NOT NULL) 
  OR 
  (get_usuario_atual() IS NOT NULL)
  OR
  -- Como fallback, permitir inserção se existe um usuário ativo na tabela usuarios com o email autenticado
  (EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE email = auth.email() 
    AND ativo = true
  ))
);

-- Criar função para verificar se o contexto de autenticação está funcionando
CREATE OR REPLACE FUNCTION public.debug_auth_context()
RETURNS TABLE(
  auth_uid uuid,
  auth_email text,
  get_usuario_atual_result uuid,
  usuario_exists boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY SELECT 
    auth.uid() as auth_uid,
    auth.email() as auth_email,
    get_usuario_atual() as get_usuario_atual_result,
    EXISTS(SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND ativo = true) as usuario_exists;
END;
$$;