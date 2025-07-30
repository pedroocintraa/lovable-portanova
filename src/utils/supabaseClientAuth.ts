/**
 * Utilitário para recriar o cliente Supabase com sessão forçada
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = "https://leyeltbhwuxssawmhqcb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxleWVsdGJod3V4c3Nhd21ocWNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MjYxNDMsImV4cCI6MjA2NDIwMjE0M30.CUtVvWXt10-L_Bsx8oUHp541sLZr9DPIabU6Uy8XAkY";

export const createAuthenticatedSupabaseClient = async (session: any) => {
  const client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    },
  });
  
  // Definir a sessão manualmente no cliente
  await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  
  return client;
};

export const forceAuthContext = async (supabaseClient: any, session: any) => {
  console.log('🔧 ForceAuthContext: Forçando contexto de autenticação...');
  
  // Definir headers de autorização manualmente
  supabaseClient.rest.headers = {
    ...supabaseClient.rest.headers,
    Authorization: `Bearer ${session.access_token}`,
  };
  
  // Verificar se o contexto foi aplicado
  const { data: testAuth } = await supabaseClient.rpc('debug_auth_context');
  console.log('🔍 ForceAuthContext: Teste de contexto após força:', testAuth);
  
  return supabaseClient;
};