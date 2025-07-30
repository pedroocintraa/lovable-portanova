-- Corrigir política RLS para SUPERVISOR ver todos os usuários subordinados
DROP POLICY IF EXISTS "usuarios_select_supervisor" ON public.usuarios;

-- Nova política: SUPERVISOR pode ver todos os SUPERVISOR_EQUIPE e VENDEDOR do sistema
CREATE POLICY "usuarios_select_supervisor" 
ON public.usuarios 
FOR SELECT 
USING (
  get_funcao_usuario_atual() = 'SUPERVISOR'::funcao_usuario 
  AND (
    funcao IN ('SUPERVISOR_EQUIPE'::funcao_usuario, 'VENDEDOR'::funcao_usuario)
    OR id = get_usuario_atual() -- Pode ver a si mesmo
  )
);

-- Verificar e corrigir política de UPDATE para SUPERVISOR (deve seguir a mesma lógica)
DROP POLICY IF EXISTS "usuarios_update_supervisor" ON public.usuarios;

CREATE POLICY "usuarios_update_supervisor" 
ON public.usuarios 
FOR UPDATE 
USING (
  get_funcao_usuario_atual() = 'SUPERVISOR'::funcao_usuario 
  AND (
    funcao IN ('SUPERVISOR_EQUIPE'::funcao_usuario, 'VENDEDOR'::funcao_usuario)
    OR id = get_usuario_atual() -- Pode editar a si mesmo
  )
);