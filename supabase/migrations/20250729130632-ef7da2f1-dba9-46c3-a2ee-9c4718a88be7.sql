-- Security fixes for database functions
-- Fix search_path for security functions

-- Update get_usuario_atual function with explicit search path
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

-- Update get_funcao_usuario_atual function with explicit search path
CREATE OR REPLACE FUNCTION public.get_funcao_usuario_atual()
 RETURNS funcao_usuario
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT funcao FROM public.usuarios WHERE email = auth.email() AND ativo = true LIMIT 1;
$function$;

-- Update get_equipe_usuario_atual function with explicit search path
CREATE OR REPLACE FUNCTION public.get_equipe_usuario_atual()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT equipe_id FROM public.usuarios WHERE email = auth.email() AND ativo = true LIMIT 1;
$function$;

-- Update is_admin function with explicit search path
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT get_funcao_usuario_atual() = 'ADMINISTRADOR_GERAL';
$function$;

-- Update is_admin_or_supervisor function with explicit search path
CREATE OR REPLACE FUNCTION public.is_admin_or_supervisor()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT get_funcao_usuario_atual() IN ('ADMINISTRADOR_GERAL', 'SUPERVISOR');
$function$;

-- Add rate limiting table for failed login attempts
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  email text NOT NULL,
  attempted_at timestamp with time zone DEFAULT now(),
  success boolean DEFAULT false
);

-- Enable RLS on login_attempts
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON public.login_attempts(ip_address, attempted_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON public.login_attempts(email, attempted_at);

-- Policy: Only admins can view login attempts
CREATE POLICY "Admins can view login attempts" ON public.login_attempts
FOR SELECT USING (is_admin());

-- Function to check rate limiting
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_ip inet, p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Function to log login attempts
CREATE OR REPLACE FUNCTION public.log_login_attempt(p_ip inet, p_email text, p_success boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.login_attempts (ip_address, email, success)
  VALUES (p_ip, p_email, p_success);
  
  -- Clean up old records (keep only last 24 hours)
  DELETE FROM public.login_attempts
  WHERE attempted_at < now() - interval '24 hours';
END;
$$;

-- Add session timeout function
CREATE OR REPLACE FUNCTION public.check_session_timeout()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  last_activity timestamp with time zone;
BEGIN
  -- For this implementation, we'll rely on Supabase's built-in session management
  -- This function can be extended for custom session timeout logic
  RETURN true;
END;
$$;

-- Log security enhancement
PERFORM log_security_event(
  'SECURITY_ENHANCEMENT_APPLIED',
  NULL,
  NULL,
  NULL,
  jsonb_build_object(
    'enhancements', ARRAY[
      'rate_limiting_implemented',
      'login_attempt_tracking',
      'function_search_path_secured'
    ]
  )
);