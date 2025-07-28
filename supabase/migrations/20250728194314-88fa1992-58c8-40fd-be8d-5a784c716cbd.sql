-- Habilitar a extensão HTTP no Supabase
CREATE EXTENSION IF NOT EXISTS http;

-- Atualizar a função para usar o método correto de chamada HTTP
CREATE OR REPLACE FUNCTION public.enviar_email_boas_vindas()
RETURNS TRIGGER AS $$
DECLARE
  function_url text;
  payload json;
  http_response record;
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
      SELECT * INTO http_response
      FROM http_post(
        function_url,
        payload::text,
        'application/json'
      );
      
      -- Log do resultado
      IF http_response.status = 200 THEN
        RAISE NOTICE 'Email de boas-vindas enviado com sucesso para: % (%)', NEW.nome, NEW.email;
      ELSE
        RAISE WARNING 'Falha ao enviar email de boas-vindas para: % (%). Status: %', NEW.nome, NEW.email, http_response.status;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Se falhar, apenas registra o erro mas não impede a criação do usuário
      RAISE WARNING 'Erro ao tentar enviar email de boas-vindas para: % (%). Erro: %', NEW.nome, NEW.email, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;