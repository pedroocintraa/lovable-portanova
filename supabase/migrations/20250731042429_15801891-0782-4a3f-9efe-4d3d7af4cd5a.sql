-- Remover triggers primeiro, depois as funções
DROP TRIGGER IF EXISTS check_minimum_admin_count_update ON public.usuarios;
DROP TRIGGER IF EXISTS check_minimum_admin_trigger ON public.usuarios;
DROP TRIGGER IF EXISTS check_minimum_admin_count_trigger ON public.usuarios;

-- Agora remover as funções de verificação de permissões
DROP FUNCTION IF EXISTS public.check_minimum_admin_count();
DROP FUNCTION IF EXISTS public.is_admin_safe();
DROP FUNCTION IF EXISTS public.is_admin_or_supervisor_safe();
DROP FUNCTION IF EXISTS public.get_current_user_role();
DROP FUNCTION IF EXISTS public.get_funcao_usuario_atual();