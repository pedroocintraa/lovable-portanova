-- Remove trigger that calls send-welcome-email function
DROP TRIGGER IF EXISTS trigger_enviar_email_boas_vindas ON public.usuarios;