-- Remover triggers duplicados e recriar apenas um
DROP TRIGGER IF EXISTS enviar_email_boas_vindas_trigger ON public.usuarios;
DROP TRIGGER IF EXISTS trigger_enviar_email_boas_vindas ON public.usuarios;

-- Recriar trigger único para envio de email
CREATE TRIGGER trigger_enviar_email_boas_vindas
  AFTER INSERT ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.enviar_email_boas_vindas();