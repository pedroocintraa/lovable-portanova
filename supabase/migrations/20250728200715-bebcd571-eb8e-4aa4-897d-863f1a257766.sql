-- Etapa 1: Preparação da migração para integração com Supabase Auth

-- 1. Criar função para migrar usuários existentes para auth.users
CREATE OR REPLACE FUNCTION public.migrar_usuario_para_auth(
  p_usuario_id UUID,
  p_email TEXT,
  p_senha TEXT DEFAULT 'senha123'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  auth_user_id UUID;
BEGIN
  -- Inserir usuário no auth.users usando a API do Supabase
  -- Nota: Isso precisa ser feito via código, não SQL direto
  -- Esta função será chamada após criarmos o usuário via Supabase client
  
  -- Por enquanto, apenas log
  RAISE NOTICE 'Preparando migração para usuário: % (email: %)', p_usuario_id, p_email;
END;
$$;

-- 2. Atualizar função get_usuario_atual para usar auth.uid()
CREATE OR REPLACE FUNCTION public.get_usuario_atual()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- Primeiro tenta pelo auth.uid(), depois fallback para o método antigo
  SELECT COALESCE(
    (SELECT id FROM public.usuarios WHERE id = auth.uid() AND ativo = true LIMIT 1),
    (SELECT id FROM public.usuarios WHERE email = auth.email() AND ativo = true LIMIT 1)
  );
$function$;

-- 3. Criar função para sincronizar dados do usuário
CREATE OR REPLACE FUNCTION public.sincronizar_usuario_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Atualizar dados na tabela usuarios quando auth.users for modificado
  IF TG_OP = 'UPDATE' AND OLD.email IS DISTINCT FROM NEW.email THEN
    UPDATE public.usuarios 
    SET email = NEW.email, updated_at = now()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Criar trigger para sincronização (será ativado depois da migração)
-- Por enquanto não ativamos para não interferir no sistema atual

-- 5. Atualizar função de email para verificar se é auth user
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
BEGIN
  -- Verificar se é um usuário do auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = NEW.id) INTO is_auth_user;
  
  -- Só envia email se o usuário está ativo, não é o admin teste e existe no auth.users
  IF NEW.ativo = true AND NEW.email != 'admin@teste.com' AND is_auth_user THEN
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
    RAISE NOTICE 'Iniciando envio de email para usuário auth: % (%)', NEW.nome, NEW.email;
    
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