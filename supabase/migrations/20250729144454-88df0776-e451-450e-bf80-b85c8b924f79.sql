-- Criar trigger para envio automático de email de boas-vindas
CREATE OR REPLACE TRIGGER usuario_criado_trigger
  AFTER INSERT ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.enviar_email_boas_vindas();