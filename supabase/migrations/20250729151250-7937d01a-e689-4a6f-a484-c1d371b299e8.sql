-- Modify the trigger to pass the temporary password to the welcome email function
CREATE OR REPLACE FUNCTION public.enviar_email_boas_vindas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  function_url text;
  payload json;
  http_response record;
  is_auth_user boolean;
  senha_temporaria text;
BEGIN
  -- Verificar se é um usuário do auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = NEW.id) INTO is_auth_user;
  
  -- Só envia email se o usuário está ativo, não é o admin teste e existe no auth.users
  IF NEW.ativo = true AND NEW.email != 'admin@teste.com' AND is_auth_user THEN
    -- URL da Edge Function
    function_url := 'https://leyeltbhwuxssawmhqcb.supabase.co/functions/v1/send-welcome-email';
    
    -- Tentar obter a senha temporária dos metadados do auth
    BEGIN
      SELECT (raw_user_meta_data->>'senha_temporaria')::text 
      INTO senha_temporaria
      FROM auth.users 
      WHERE id = NEW.id;
    EXCEPTION WHEN OTHERS THEN
      senha_temporaria := null;
    END;
    
    -- Preparar payload com dados do usuário incluindo senha temporária
    payload := json_build_object(
      'usuario_id', NEW.id,
      'nome', NEW.nome,
      'email', NEW.email,
      'funcao', NEW.funcao,
      'senha_temporaria', senha_temporaria
    );
    
    -- Log inicial
    RAISE NOTICE 'Iniciando envio de email para usuário auth: % (%) - Senha incluída: %', 
                 NEW.nome, NEW.email, (senha_temporaria IS NOT NULL);
    
    -- Fazer chamada HTTP para a Edge Function
    BEGIN
      SELECT * INTO http_response
      FROM http_post(
        function_url,
        payload::text,
        'application/json'
      );
      
      -- Log detalhado do resultado
      RAISE NOTICE 'Resposta HTTP: Status %, Content %', http_response.status, http_response.content;
      
      IF http_response.status = 200 THEN
        RAISE NOTICE 'Email de boas-vindas enviado com sucesso para: % (%)', NEW.nome, NEW.email;
      ELSE
        RAISE WARNING 'Falha ao enviar email de boas-vindas para: % (%). Status: %, Content: %', 
                     NEW.nome, NEW.email, http_response.status, http_response.content;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log detalhado do erro
      RAISE WARNING 'Erro ao tentar enviar email de boas-vindas para: % (%). Erro: %', 
                   NEW.nome, NEW.email, SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'Email não enviado para: % (%) - ativo: %, admin teste: %, auth user: %', 
                NEW.nome, NEW.email, NEW.ativo, (NEW.email = 'admin@teste.com'), is_auth_user;
  END IF;
  
  RETURN NEW;
END;
$function$;