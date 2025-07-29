-- Remover o trigger de envio de email de boas-vindas
DROP TRIGGER IF EXISTS trigger_enviar_email_boas_vindas ON public.usuarios;

-- Remover a função de envio de email de boas-vindas
DROP FUNCTION IF EXISTS public.enviar_email_boas_vindas();