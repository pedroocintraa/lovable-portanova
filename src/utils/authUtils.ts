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
  console.log('🔄 AuthUtils: Verificando e renovando token JWT...');
  
  // Primeiro, tentar obter a sessão atual
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (!session) {
    console.error('❌ AuthUtils: Nenhuma sessão ativa encontrada');
    throw new Error('Sessão não encontrada. Faça login novamente.');
  }
  
  console.log('🔍 AuthUtils: Sessão encontrada:', {
    userId: session.user?.id,
    hasAccessToken: !!session.access_token,
    hasRefreshToken: !!session.refresh_token,
    expiresAt: session.expires_at
  });
  
  // Verificar se o token ainda é válido (expira em menos de 5 minutos)
  const now = Math.floor(Date.now() / 1000);
  const tokenExpiresIn = (session.expires_at || 0) - now;
  
  if (tokenExpiresIn < 300) { // Menos de 5 minutos
    console.log('🔄 AuthUtils: Token próximo do vencimento, renovando...');
    
    const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError || !refreshedSession.session) {
      console.error('❌ AuthUtils: Erro ao renovar token:', refreshError);
      throw new Error('Falha na renovação do token. Faça login novamente.');
    }
    
    console.log('✅ AuthUtils: Token renovado com sucesso');
    return {
      user: refreshedSession.session.user,
      session: refreshedSession.session
    };
  }
  
  console.log('✅ AuthUtils: Token válido');
  return {
    user: session.user,
    session: session
  };
};