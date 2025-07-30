/**
 * Utilitários para verificação e debug de autenticação
 */
import { supabase } from "@/integrations/supabase/client";

export const debugAuthState = async (): Promise<{
  isAuthenticated: boolean;
  user: any;
  session: any;
  error?: string;
}> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    console.log('🔍 AuthUtils Debug:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      accessToken: session?.access_token ? 'presente' : 'ausente',
      refreshToken: session?.refresh_token ? 'presente' : 'ausente',
      error
    });

    return {
      isAuthenticated: !!session?.user,
      user: session?.user,
      session,
      error: error?.message
    };
  } catch (err: any) {
    console.error('❌ Erro ao verificar estado de autenticação:', err);
    return {
      isAuthenticated: false,
      user: null,
      session: null,
      error: err.message
    };
  }
};

export const ensureAuthenticated = async (): Promise<{ user: any; session: any } | null> => {
  const authState = await debugAuthState();
  
  if (!authState.isAuthenticated) {
    throw new Error('Usuário não autenticado. Faça login novamente.');
  }
  
  return {
    user: authState.user,
    session: authState.session
  };
};

export const ensureValidToken = async (): Promise<{ user: any; session: any }> => {
  console.log('🔄 AuthUtils: Verificando e garantindo token JWT válido...');
  
  // Primeiro, verificar se há uma sessão ativa
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    console.error('❌ AuthUtils: Nenhuma sessão ativa encontrada');
    throw new Error('Sessão não encontrada. Faça login novamente.');
  }
  
  console.log('🔍 AuthUtils: Sessão atual:', {
    userId: session.user?.id,
    userEmail: session.user?.email,
    hasAccessToken: !!session.access_token,
    expiresAt: session.expires_at,
    tokenLength: session.access_token?.length
  });
  
  // Testar se o token está funcionando no contexto do banco
  console.log('🔍 AuthUtils: Testando contexto de autenticação no banco...');
  const { data: authTest, error: authTestError } = await supabase.rpc('debug_auth_context');
  
  if (authTestError) {
    console.error('❌ AuthUtils: Erro ao testar contexto:', authTestError);
  }
  
  console.log('🔍 AuthUtils: Resultado do teste de contexto:', authTest);
  
  // Se auth.uid() retornar null, forçar renovação do token
  if (!authTest || !authTest[0]?.auth_uid) {
    console.log('⚠️ AuthUtils: auth.uid() está null, forçando renovação de token...');
    
    const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError || !refreshedSession.session) {
      console.error('❌ AuthUtils: Erro ao renovar token:', refreshError);
      throw new Error('Falha ao renovar token de autenticação. Faça login novamente.');
    }
    
    console.log('✅ AuthUtils: Token renovado, testando novamente...');
    
    // Aguardar um momento para o token ser propagado
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Testar novamente após renovação
    const { data: authTestAfter } = await supabase.rpc('debug_auth_context');
    console.log('🔍 AuthUtils: Teste após renovação:', authTestAfter);
    
    return {
      user: refreshedSession.session.user,
      session: refreshedSession.session
    };
  }
  
  console.log('✅ AuthUtils: Token validado e funcionando corretamente');
  return {
    user: session.user,
    session: session
  };
};