-- Remove triggers problemáticos que fazem referência à função inexistente
DROP TRIGGER IF EXISTS validate_status_transition_trigger ON public.vendas;
DROP TRIGGER IF EXISTS validate_vendas_status_transition ON public.vendas;

-- Remove a função que faz referência à função inexistente is_admin_or_supervisor
DROP FUNCTION IF EXISTS public.validate_status_transition();

-- Remove qualquer outra referência à função antiga is_admin_or_supervisor
DROP FUNCTION IF EXISTS public.is_admin_or_supervisor();