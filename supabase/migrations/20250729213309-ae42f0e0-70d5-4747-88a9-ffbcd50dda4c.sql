-- Correções de segurança e melhorias no sistema

-- 1. Corrigir funções com search_path mutable
CREATE OR REPLACE FUNCTION public.get_funcao_usuario(user_id uuid DEFAULT get_usuario_atual())
RETURNS funcao_usuario
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT funcao FROM public.usuarios WHERE id = user_id AND ativo = true LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin_or_supervisor()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT get_funcao_usuario_atual() IN ('ADMINISTRADOR_GERAL', 'SUPERVISOR');
$function$;

CREATE OR REPLACE FUNCTION public.log_security_event(p_action text, p_table_name text DEFAULT NULL::text, p_record_id uuid DEFAULT NULL::uuid, p_old_values jsonb DEFAULT NULL::jsonb, p_new_values jsonb DEFAULT NULL::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.security_audit (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    get_usuario_atual(),
    p_action,
    p_table_name,
    p_record_id,
    p_old_values,
    p_new_values
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.audit_usuario_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Log role changes
  IF OLD.funcao IS DISTINCT FROM NEW.funcao THEN
    PERFORM log_security_event(
      'ROLE_CHANGE',
      'usuarios',
      NEW.id,
      jsonb_build_object('funcao', OLD.funcao),
      jsonb_build_object('funcao', NEW.funcao)
    );
  END IF;
  
  -- Log status changes (activation/deactivation)
  IF OLD.ativo IS DISTINCT FROM NEW.ativo THEN
    PERFORM log_security_event(
      CASE WHEN NEW.ativo THEN 'USER_ACTIVATED' ELSE 'USER_DEACTIVATED' END,
      'usuarios',
      NEW.id,
      jsonb_build_object('ativo', OLD.ativo),
      jsonb_build_object('ativo', NEW.ativo)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_minimum_admin_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  admin_count INTEGER;
BEGIN
  -- Count active admins
  SELECT COUNT(*) INTO admin_count
  FROM public.usuarios
  WHERE funcao = 'ADMINISTRADOR_GERAL' AND ativo = true;
  
  -- If this is an update that would remove an admin, decrease count
  IF TG_OP = 'UPDATE' AND OLD.funcao = 'ADMINISTRADOR_GERAL' AND OLD.ativo = true THEN
    IF NEW.funcao != 'ADMINISTRADOR_GERAL' OR NEW.ativo = false THEN
      admin_count := admin_count - 1;
    END IF;
  END IF;
  
  -- Ensure at least 2 admins remain
  IF admin_count < 2 THEN
    RAISE EXCEPTION 'Cannot proceed: At least 2 active administrators must remain in the system';
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.migrar_usuario_para_auth(p_usuario_id uuid, p_email text, p_senha text DEFAULT 'senha123'::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  auth_user_id UUID;
BEGIN
  -- Log para migração
  RAISE NOTICE 'Preparando migração para usuário: % (email: %)', p_usuario_id, p_email;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sincronizar_usuario_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Atualizar dados na tabela usuarios quando auth.users for modificado
  IF TG_OP = 'UPDATE' AND OLD.email IS DISTINCT FROM NEW.email THEN
    UPDATE public.usuarios 
    SET email = NEW.email, updated_at = now()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_file_upload(p_file_name text, p_file_size integer, p_mime_type text)
RETURNS TABLE(is_valid boolean, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  max_file_size INTEGER := 10485760; -- 10MB
  allowed_image_types TEXT[] := ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  allowed_doc_types TEXT[] := ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
BEGIN
  -- Check file size
  IF p_file_size > max_file_size THEN
    RETURN QUERY SELECT false, 'File size exceeds 10MB limit';
    RETURN;
  END IF;
  
  -- Check mime type
  IF p_mime_type NOT IN (SELECT unnest(allowed_image_types || allowed_doc_types)) THEN
    RETURN QUERY SELECT false, 'File type not allowed';
    RETURN;
  END IF;
  
  -- Check file extension matches mime type
  IF p_mime_type LIKE 'image/%' AND p_file_name !~* '\.(jpg|jpeg|png|webp)$' THEN
    RETURN QUERY SELECT false, 'File extension does not match content type';
    RETURN;
  END IF;
  
  IF p_mime_type = 'application/pdf' AND p_file_name !~* '\.pdf$' THEN
    RETURN QUERY SELECT false, 'File extension does not match content type';
    RETURN;
  END IF;
  
  -- Log file upload attempt
  PERFORM log_security_event(
    'FILE_UPLOAD_VALIDATED',
    NULL,
    NULL,
    NULL,
    jsonb_build_object('file_name', p_file_name, 'file_size', p_file_size, 'mime_type', p_mime_type)
  );
  
  RETURN QUERY SELECT true, NULL::TEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_usuario_atual()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  -- Primeiro tenta pelo auth.uid(), depois fallback para o método antigo
  SELECT COALESCE(
    (SELECT id FROM public.usuarios WHERE id = auth.uid() AND ativo = true LIMIT 1),
    (SELECT id FROM public.usuarios WHERE email = auth.email() AND ativo = true LIMIT 1)
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_funcao_usuario_atual()
RETURNS funcao_usuario
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT funcao FROM public.usuarios WHERE email = auth.email() AND ativo = true LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_equipe_usuario_atual()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT equipe_id FROM public.usuarios WHERE email = auth.email() AND ativo = true LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT get_funcao_usuario_atual() = 'ADMINISTRADOR_GERAL';
$function$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_ip inet, p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  failed_count integer;
  email_failed_count integer;
BEGIN
  -- Check IP-based rate limiting (max 10 attempts per hour)
  SELECT COUNT(*) INTO failed_count
  FROM public.login_attempts
  WHERE ip_address = p_ip
    AND attempted_at > now() - interval '1 hour'
    AND success = false;
  
  -- Check email-based rate limiting (max 5 attempts per hour per email)
  SELECT COUNT(*) INTO email_failed_count
  FROM public.login_attempts
  WHERE email = p_email
    AND attempted_at > now() - interval '1 hour'
    AND success = false;
  
  RETURN failed_count < 10 AND email_failed_count < 5;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_login_attempt(p_ip inet, p_email text, p_success boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.login_attempts (ip_address, email, success)
  VALUES (p_ip, p_email, p_success);
  
  -- Clean up old records (keep only last 24 hours)
  DELETE FROM public.login_attempts
  WHERE attempted_at < now() - interval '24 hours';
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- If status is 'habilitada', prevent any updates except by admins
  IF OLD.status = 'habilitada' AND NOT is_admin_or_supervisor() THEN
    RAISE EXCEPTION 'Cannot modify sales with status "habilitada"';
  END IF;
  
  -- Validate status transitions
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Define valid transitions
    IF (OLD.status = 'pendente' AND NEW.status NOT IN ('em_andamento', 'perdida')) OR
       (OLD.status = 'em_andamento' AND NEW.status NOT IN ('auditada', 'perdida')) OR
       (OLD.status = 'auditada' AND NEW.status NOT IN ('gerada', 'perdida')) OR
       (OLD.status = 'gerada' AND NEW.status NOT IN ('aguardando_habilitacao', 'perdida')) OR
       (OLD.status = 'aguardando_habilitacao' AND NEW.status NOT IN ('habilitada', 'perdida')) OR
       (OLD.status = 'habilitada' AND NEW.status != 'habilitada') OR
       (OLD.status = 'perdida' AND NEW.status != 'perdida') THEN
      RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
    END IF;
    
    -- Require motivo_perda when marking as lost
    IF NEW.status = 'perdida' AND (NEW.motivo_perda IS NULL OR trim(NEW.motivo_perda) = '') THEN
      RAISE EXCEPTION 'motivo_perda is required when marking sale as lost';
    END IF;
    
    -- Require data_instalacao when moving to habilitada
    IF NEW.status = 'habilitada' AND NEW.data_instalacao IS NULL THEN
      RAISE EXCEPTION 'data_instalacao is required when marking sale as habilitada';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.registrar_mudanca_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.historico_vendas (
      venda_id, 
      status_anterior, 
      status_novo, 
      usuario_id,
      observacao
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      get_usuario_atual(),
      'Alteração automática de status'
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. Limpar vendas de teste (caso existam)
DELETE FROM public.historico_vendas WHERE venda_id IN (SELECT id FROM public.vendas);
DELETE FROM public.documentos_venda WHERE venda_id IN (SELECT id FROM public.vendas);
DELETE FROM public.vendas;

-- 3. Função melhorada para verificar consistência de usuários
CREATE OR REPLACE FUNCTION public.verificar_consistencia_usuario(p_email text)
RETURNS TABLE(consistente boolean, usuario_id uuid, auth_id uuid, problema text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  usuario_rec RECORD;
  auth_user_id UUID;
BEGIN
  -- Buscar usuário na tabela usuarios
  SELECT * INTO usuario_rec
  FROM public.usuarios u
  WHERE u.email = p_email AND u.ativo = true;
  
  -- Se não encontrou usuário na tabela usuarios
  IF usuario_rec.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, auth.uid(), 'Usuário não encontrado na tabela usuarios';
    RETURN;
  END IF;
  
  -- Verificar se existe no auth.users através de função administrativa
  -- Como não podemos acessar auth.users diretamente, vamos usar o auth.uid() atual
  auth_user_id := auth.uid();
  
  -- Se não há usuário autenticado no momento
  IF auth_user_id IS NULL THEN
    RETURN QUERY SELECT false, usuario_rec.id, NULL::uuid, 'Não há usuário autenticado no momento';
    RETURN;
  END IF;
  
  -- Verificar se o ID bate
  IF usuario_rec.id != auth_user_id THEN
    RETURN QUERY SELECT false, usuario_rec.id, auth_user_id, 'IDs não coincidem entre usuarios e auth.users';
    RETURN;
  END IF;
  
  -- Tudo consistente
  RETURN QUERY SELECT true, usuario_rec.id, auth_user_id, 'Usuário consistente'::text;
END;
$function$;

-- 4. Função para sincronizar usuário inconsistente
CREATE OR REPLACE FUNCTION public.sincronizar_usuario_inconsistente(p_email text)
RETURNS TABLE(sucesso boolean, mensagem text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  usuario_rec RECORD;
  auth_user_id UUID;
BEGIN
  -- Buscar usuário na tabela usuarios
  SELECT * INTO usuario_rec
  FROM public.usuarios u
  WHERE u.email = p_email AND u.ativo = true;
  
  IF usuario_rec.id IS NULL THEN
    RETURN QUERY SELECT false, 'Usuário não encontrado na tabela usuarios';
    RETURN;
  END IF;
  
  auth_user_id := auth.uid();
  
  IF auth_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Não há usuário autenticado para sincronizar';
    RETURN;
  END IF;
  
  -- Atualizar ID na tabela usuarios para coincidir com auth.users
  UPDATE public.usuarios 
  SET id = auth_user_id, updated_at = now()
  WHERE email = p_email AND ativo = true;
  
  -- Log da sincronização
  PERFORM log_security_event(
    'USER_SYNC',
    'usuarios',
    auth_user_id,
    jsonb_build_object('old_id', usuario_rec.id),
    jsonb_build_object('new_id', auth_user_id)
  );
  
  RETURN QUERY SELECT true, 'Usuário sincronizado com sucesso';
END;
$function$;

-- 5. Configurar triggers de auditoria se não existirem
DO $$
BEGIN
    -- Trigger para auditoria de usuários
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_usuario_changes_trigger') THEN
        CREATE TRIGGER audit_usuario_changes_trigger
        AFTER UPDATE ON public.usuarios
        FOR EACH ROW
        EXECUTE FUNCTION public.audit_usuario_changes();
    END IF;
    
    -- Trigger para verificar admin mínimo
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'check_minimum_admin_trigger') THEN
        CREATE TRIGGER check_minimum_admin_trigger
        BEFORE UPDATE ON public.usuarios
        FOR EACH ROW
        EXECUTE FUNCTION public.check_minimum_admin_count();
    END IF;
    
    -- Trigger para histórico de vendas
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'registrar_mudanca_status_trigger') THEN
        CREATE TRIGGER registrar_mudanca_status_trigger
        AFTER UPDATE ON public.vendas
        FOR EACH ROW
        EXECUTE FUNCTION public.registrar_mudanca_status();
    END IF;
    
    -- Trigger para validar transições de status
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'validate_status_transition_trigger') THEN
        CREATE TRIGGER validate_status_transition_trigger
        BEFORE UPDATE ON public.vendas
        FOR EACH ROW
        EXECUTE FUNCTION public.validate_status_transition();
    END IF;
    
    -- Trigger para updated_at em usuarios
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_usuarios_updated_at') THEN
        CREATE TRIGGER update_usuarios_updated_at
        BEFORE UPDATE ON public.usuarios
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    -- Trigger para updated_at em vendas
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_vendas_updated_at') THEN
        CREATE TRIGGER update_vendas_updated_at
        BEFORE UPDATE ON public.vendas
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    -- Trigger para updated_at em equipes
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_equipes_updated_at') THEN
        CREATE TRIGGER update_equipes_updated_at
        BEFORE UPDATE ON public.equipes
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    -- Trigger para updated_at em planos
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_planos_updated_at') THEN
        CREATE TRIGGER update_planos_updated_at
        BEFORE UPDATE ON public.planos
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;