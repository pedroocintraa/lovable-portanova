/**
 * Correção completa de autenticação com debug avançado e fallbacks robustos
 */
import { supabase } from "@/integrations/supabase/client";

interface AuthDebugResult {
  auth_uid: string | null;
  auth_email: string | null;
  jwt_claims: any;
  session_valid: boolean;
  usuario_encontrado: boolean;
  usuario_id: string | null;
  usuario_nome: string | null;
  usuario_funcao: string | null;
  timestamp_check: string;
}

export const debugAuthenticationAdvanced = async (): Promise<AuthDebugResult> => {
  console.log('🔍 Executando debug avançado de autenticação...');
  
  try {
    const { data, error } = await supabase.rpc('debug_auth_advanced');
    
    if (error) {
      console.error('❌ Erro no debug avançado:', error);
      throw error;
    }

    const result = data?.[0] || {
      auth_uid: null,
      auth_email: null,
      jwt_claims: null,
      session_valid: false,
      usuario_encontrado: false,
      usuario_id: null,
      usuario_nome: null,
      usuario_funcao: null,
      timestamp_check: new Date().toISOString()
    };
    console.log('🔍 Resultado do debug avançado:', result);
    
    return result;
  } catch (error: any) {
    console.error('❌ Falha no debug avançado:', error);
    return {
      auth_uid: null,
      auth_email: null,
      jwt_claims: null,
      session_valid: false,
      usuario_encontrado: false,
      usuario_id: null,
      usuario_nome: null,
      usuario_funcao: null,
      timestamp_check: new Date().toISOString()
    };
  }
};

export const forceTokenRefresh = async (): Promise<boolean> => {
  console.log('🔄 Forçando refresh do token JWT...');
  
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('❌ Erro ao refresh do token:', error);
      return false;
    }

    if (data.session) {
      console.log('✅ Token refreshed com sucesso');
      console.log('📊 Nova sessão:', {
        hasAccessToken: !!data.session.access_token,
        expiresAt: data.session.expires_at,
        userId: data.session.user?.id
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Falha crítica no refresh:', error);
    return false;
  }
};

export const validateAndFixAuth = async (): Promise<{
  success: boolean;
  message: string;
  authData?: any;
}> => {
  console.log('🛠️ Iniciando validação e correção de autenticação...');

  try {
    // 1. Verificar estado atual da sessão
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return {
        success: false,
        message: 'Nenhuma sessão ativa encontrada. Faça login novamente.'
      };
    }

    console.log('📊 Sessão encontrada:', {
      userId: session.user?.id,
      email: session.user?.email,
      hasToken: !!session.access_token
    });

    // 2. Executar debug avançado
    const debugResult = await debugAuthenticationAdvanced();
    
    // 3. Se auth.uid() está null, tentar refresh
    if (!debugResult.session_valid && session.access_token) {
      console.log('⚠️ auth.uid() está null, tentando refresh...');
      
      const refreshSuccess = await forceTokenRefresh();
      
      if (refreshSuccess) {
        // Aguardar propagação
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Testar novamente
        const debugAfterRefresh = await debugAuthenticationAdvanced();
        
        return {
          success: debugAfterRefresh.session_valid,
          message: debugAfterRefresh.session_valid 
            ? 'Autenticação corrigida com sucesso' 
            : 'Refresh realizado mas contexto ainda inválido',
          authData: debugAfterRefresh
        };
      }
    }

    // 4. Verificar se usuário foi encontrado
    if (!debugResult.usuario_encontrado) {
      return {
        success: false,
        message: 'Usuário não encontrado na base de dados local. Execute a migração.',
        authData: debugResult
      };
    }

    return {
      success: debugResult.session_valid && debugResult.usuario_encontrado,
      message: debugResult.session_valid 
        ? 'Autenticação válida e funcionando' 
        : 'Problemas no contexto de autenticação detectados',
      authData: debugResult
    };

  } catch (error: any) {
    console.error('❌ Erro na validação de autenticação:', error);
    return {
      success: false,
      message: `Erro na validação: ${error.message}`
    };
  }
};

export const retryAuthOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Tentativa ${attempt}/${maxRetries} da operação...`);
      
      const result = await operation();
      console.log(`✅ Operação bem-sucedida na tentativa ${attempt}`);
      return result;
      
    } catch (error: any) {
      console.log(`❌ Tentativa ${attempt} falhou:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Se o erro for de autenticação, tentar corrigir
      if (error.message?.includes('auth') || error.message?.includes('JWT')) {
        console.log('🛠️ Tentando corrigir autenticação antes da próxima tentativa...');
        await validateAndFixAuth();
      }
      
      // Aguardar antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  
  throw new Error(`Operação falhou após ${maxRetries} tentativas`);
};