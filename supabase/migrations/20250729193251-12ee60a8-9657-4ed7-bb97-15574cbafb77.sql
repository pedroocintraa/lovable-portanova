-- Remover o trigger e a função de envio de email em cascata
DROP TRIGGER IF EXISTS usuario_criado_trigger ON public.usuarios;
DROP FUNCTION IF EXISTS public.enviar_email_boas_vindas() CASCADE;