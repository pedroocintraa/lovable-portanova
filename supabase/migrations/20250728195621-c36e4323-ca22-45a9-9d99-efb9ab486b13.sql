-- Limpeza de usuários: manter apenas o ADMIN TESTE
-- Primeiro, desabilitar o trigger temporariamente para evitar emails durante limpeza
DROP TRIGGER IF EXISTS enviar_email_boas_vindas_trigger ON public.usuarios;

-- Limpar usuários, mantendo apenas o admin teste
DELETE FROM public.usuarios 
WHERE email != 'admin@teste.com';

-- Recriar o trigger de email corrigido
CREATE OR REPLACE FUNCTION public.enviar_email_boas_vindas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  function_url text;
  payload json;
  http_response record;
BEGIN
  -- Só envia email se o usuário está ativo e não é o admin teste
  IF NEW.ativo = true AND NEW.email != 'admin@teste.com' THEN
    -- URL da Edge Function
    function_url := 'https://leyeltbhwuxssawmhqcb.supabase.co/functions/v1/send-welcome-email';
    
    -- Preparar payload com dados do usuário
    payload := json_build_object(
      'usuario_id', NEW.id,
      'nome', NEW.nome,
      'email', NEW.email,
      'funcao', NEW.funcao
    );
    
    -- Log inicial
    RAISE NOTICE 'Iniciando envio de email para: % (%)', NEW.nome, NEW.email;
    
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
    RAISE NOTICE 'Email não enviado para: % (%) - ativo: %, admin teste: %', 
                NEW.nome, NEW.email, NEW.ativo, (NEW.email = 'admin@teste.com');
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recriar o trigger
CREATE TRIGGER enviar_email_boas_vindas_trigger
  AFTER INSERT ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.enviar_email_boas_vindas();

-- Verificar dados restantes
SELECT nome, email, cpf, funcao FROM public.usuarios;