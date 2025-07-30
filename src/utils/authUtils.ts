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