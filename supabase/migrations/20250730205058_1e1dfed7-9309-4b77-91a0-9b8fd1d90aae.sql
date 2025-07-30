-- 3. Atualizar funções de permissão para usar email
CREATE OR REPLACE FUNCTION public.get_funcao_usuario_atual()
 RETURNS funcao_usuario
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT funcao FROM public.usuarios WHERE email = auth.email() AND ativo = true LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_equipe_usuario_atual()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT equipe_id FROM public.usuarios WHERE email = auth.email() AND ativo = true LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT get_funcao_usuario_atual() = 'ADMINISTRADOR_GERAL';
$function$;

CREATE OR REPLACE FUNCTION public.is_admin_or_supervisor()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT get_funcao_usuario_atual() IN ('ADMINISTRADOR_GERAL', 'SUPERVISOR');
$function$;