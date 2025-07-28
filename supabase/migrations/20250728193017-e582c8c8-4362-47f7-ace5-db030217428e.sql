-- Função para enviar email de boas-vindas via Edge Function
CREATE OR REPLACE FUNCTION public.enviar_email_boas_vindas()
RETURNS TRIGGER AS $$
DECLARE
  function_url text;
  payload json;
  response_status int;
BEGIN
  -- Só envia email se o usuário está ativo
  IF NEW.ativo = true THEN
    -- URL da Edge Function
    function_url := 'https://leyeltbhwuxssawmhqcb.supabase.co/functions/v1/send-welcome-email';
    
    -- Preparar payload com dados do usuário
    payload := json_build_object(
      'usuario_id', NEW.id,
      'nome', NEW.nome,
      'email', NEW.email,
      'funcao', NEW.funcao
    );
    
    -- Fazer chamada HTTP para a Edge Function (em background)
    BEGIN
      SELECT status INTO response_status
      FROM http((
        'POST',
        function_url,
        ARRAY[
          http_header('Content-Type', 'application/json'),
          http_header('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true))
        ],
        'application/json',
        payload::text
      ));
      
      -- Log do resultado
      IF response_status = 200 THEN
        RAISE NOTICE 'Email de boas-vindas enviado com sucesso para: % (%)', NEW.nome, NEW.email;
      ELSE
        RAISE WARNING 'Falha ao enviar email de boas-vindas para: % (%). Status: %', NEW.nome, NEW.email, response_status;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Se falhar, apenas registra o erro mas não impede a criação do usuário
      RAISE WARNING 'Erro ao tentar enviar email de boas-vindas para: % (%). Erro: %', NEW.nome, NEW.email, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para envio automático de email após inserção de usuário
DROP TRIGGER IF EXISTS trigger_enviar_email_boas_vindas ON public.usuarios;

CREATE TRIGGER trigger_enviar_email_boas_vindas
  AFTER INSERT ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.enviar_email_boas_vindas();

-- Comentários para documentação
COMMENT ON FUNCTION public.enviar_email_boas_vindas() IS 'Função que envia email de boas-vindas automaticamente quando um novo usuário é cadastrado';
COMMENT ON TRIGGER trigger_enviar_email_boas_vindas ON public.usuarios IS 'Trigger que executa envio de email de boas-vindas após inserção de novo usuário ativo';