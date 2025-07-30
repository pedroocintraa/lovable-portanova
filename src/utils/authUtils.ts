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
  
  // Forçar uma nova verificação da sessão
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (!session) {
    console.error('❌ AuthUtils: Nenhuma sessão ativa encontrada');
    throw new Error('Sessão não encontrada. Faça login novamente.');
  }
  
  console.log('🔍 AuthUtils: Sessão encontrada:', {
    userId: session.user?.id,
    userEmail: session.user?.email,
    hasAccessToken: !!session.access_token,
    hasRefreshToken: !!session.refresh_token,
    expiresAt: session.expires_at,
    tokenLength: session.access_token?.length
  });
  
  // Sempre renovar o token para garantir que seja válido
  console.log('🔄 AuthUtils: Forçando renovação do token para garantir validade...');
  
  const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession();
  
  if (refreshError || !refreshedSession.session) {
    console.error('❌ AuthUtils: Erro ao renovar token:', refreshError);
    // Se a renovação falhar, tentar usar a sessão atual
    console.log('⚠️ AuthUtils: Tentando usar sessão atual como fallback');
    return {
      user: session.user,
      session: session
    };
  }
  
  console.log('✅ AuthUtils: Token renovado com sucesso:', {
    newUserId: refreshedSession.session.user.id,
    newTokenLength: refreshedSession.session.access_token?.length,
    newExpiresAt: refreshedSession.session.expires_at
  });
  
  return {
    user: refreshedSession.session.user,
    session: refreshedSession.session
  };
};