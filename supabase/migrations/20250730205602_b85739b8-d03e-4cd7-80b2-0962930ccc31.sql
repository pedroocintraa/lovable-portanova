-- 7. Recriar função de debug para mostrar se a correção funcionou
DROP FUNCTION IF EXISTS public.debug_auth_advanced();

CREATE OR REPLACE FUNCTION public.debug_auth_advanced()
 RETURNS TABLE(auth_uid uuid, auth_email text, jwt_claims jsonb, session_valid boolean, usuario_encontrado boolean, usuario_id uuid, usuario_nome text, usuario_funcao funcao_usuario, timestamp_check timestamp with time zone, get_usuario_atual_result uuid, get_usuario_por_email_result uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY SELECT 
    auth.uid() as auth_uid,
    auth.email() as auth_email,
    auth.jwt() as jwt_claims,
    (auth.email() IS NOT NULL) as session_valid,
    EXISTS(SELECT 1 FROM public.usuarios WHERE email = auth.email() AND ativo = true) as usuario_encontrado,
    (SELECT id FROM public.usuarios WHERE email = auth.email() AND ativo = true LIMIT 1) as usuario_id,
    (SELECT nome FROM public.usuarios WHERE email = auth.email() AND ativo = true LIMIT 1) as usuario_nome,
    (SELECT funcao FROM public.usuarios WHERE email = auth.email() AND ativo = true LIMIT 1) as usuario_funcao,
    now() as timestamp_check,
    get_usuario_atual() as get_usuario_atual_result,
    get_usuario_por_email() as get_usuario_por_email_result;
END;
$function$;