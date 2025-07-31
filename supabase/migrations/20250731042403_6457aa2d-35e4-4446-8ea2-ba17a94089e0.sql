-- Remover funções de verificação de permissões desnecessárias
DROP FUNCTION IF EXISTS public.is_admin_safe();
DROP FUNCTION IF EXISTS public.is_admin_or_supervisor_safe();
DROP FUNCTION IF EXISTS public.get_current_user_role();
DROP FUNCTION IF EXISTS public.get_funcao_usuario_atual();

-- Remover triggers de verificação de admin count
DROP TRIGGER IF EXISTS check_minimum_admin_count_trigger ON public.usuarios;
DROP FUNCTION IF EXISTS public.check_minimum_admin_count();

-- Manter apenas funções essenciais:
-- - get_usuario_atual() e get_usuario_atual_robusto() (para o trigger de histórico)
-- - registrar_mudanca_status() (trigger para histórico de vendas)
-- - Outras funções utilitárias e de sistema