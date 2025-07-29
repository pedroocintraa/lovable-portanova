-- Priority 1: Critical Security Fixes

-- 1. Prevent Role Self-Elevation
-- Add policy to prevent users from updating their own role
CREATE POLICY "usuarios_prevent_self_role_elevation" 
ON public.usuarios 
FOR UPDATE 
USING (
  -- Users cannot update their own role unless they are admin changing someone else's role
  CASE 
    WHEN id = get_usuario_atual() THEN OLD.funcao = NEW.funcao  -- Can't change own role
    ELSE true  -- Admins can change others' roles (handled by existing policies)
  END
);

-- 2. Create security audit table for tracking sensitive operations
CREATE TABLE public.security_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.usuarios(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.security_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "security_audit_admin_only" 
ON public.security_audit 
FOR SELECT 
USING (get_funcao_usuario_atual() = 'ADMINISTRADOR_GERAL');

-- 3. Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_record_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- 4. Create trigger to audit role changes
CREATE OR REPLACE FUNCTION public.audit_usuario_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Create the trigger
CREATE TRIGGER audit_usuario_changes_trigger
  AFTER UPDATE ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_usuario_changes();

-- 5. Add minimum admin count constraint
CREATE OR REPLACE FUNCTION public.check_minimum_admin_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- Count active admins after the operation
  SELECT COUNT(*) INTO admin_count
  FROM public.usuarios
  WHERE funcao = 'ADMINISTRADOR_GERAL' AND ativo = true
  AND (TG_OP = 'DELETE' AND id != OLD.id OR TG_OP != 'DELETE');
  
  -- If updating/deleting, exclude the current record if it's being deactivated or role changed
  IF TG_OP = 'UPDATE' THEN
    IF NEW.funcao != 'ADMINISTRADOR_GERAL' OR NEW.ativo = false THEN
      admin_count := admin_count - 1;
    END IF;
  END IF;
  
  -- Ensure at least 2 admins remain
  IF admin_count < 2 THEN
    RAISE EXCEPTION 'Cannot proceed: At least 2 active administrators must remain in the system';
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create triggers for admin count validation
CREATE TRIGGER check_minimum_admin_count_update
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW
  WHEN (OLD.funcao = 'ADMINISTRADOR_GERAL' AND (NEW.funcao != 'ADMINISTRADOR_GERAL' OR NEW.ativo = false))
  EXECUTE FUNCTION public.check_minimum_admin_count();

-- 6. Fix function security - Set explicit search_path for all functions
-- Update existing functions to have secure search_path
CREATE OR REPLACE FUNCTION public.get_funcao_usuario_atual()
RETURNS funcao_usuario
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT funcao FROM public.usuarios WHERE email = auth.email() AND ativo = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT get_funcao_usuario_atual() = 'ADMINISTRADOR_GERAL';
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_supervisor()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT get_funcao_usuario_atual() IN ('ADMINISTRADOR_GERAL', 'SUPERVISOR');
$$;

-- 7. Create function to validate file uploads securely
CREATE OR REPLACE FUNCTION public.validate_file_upload(
  p_file_name TEXT,
  p_file_size INTEGER,
  p_mime_type TEXT
)
RETURNS TABLE(is_valid BOOLEAN, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;