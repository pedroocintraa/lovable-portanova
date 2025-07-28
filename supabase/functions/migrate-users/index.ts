import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MigrateUserRequest {
  usuario_id: string;
  email: string;
  nome: string;
  senha?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Criar cliente Supabase com service role para operações administrativas
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { usuario_id, email, nome, senha = 'senha123' }: MigrateUserRequest = await req.json();

    console.log(`Iniciando migração do usuário: ${nome} (${email})`);

    // Verificar se o usuário já existe no auth.users
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(usuario_id);
    
    if (existingUser.user) {
      console.log(`Usuário ${email} já existe no auth.users`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Usuário já existe no sistema de autenticação',
          user_id: usuario_id 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Criar usuário no auth.users com o mesmo ID
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      user_id: usuario_id, // Usar o mesmo ID da tabela usuarios
      email: email,
      password: senha,
      email_confirm: true,
      user_metadata: {
        nome: nome,
        migrated: true
      }
    });

    if (authError) {
      console.error('Erro ao criar usuário no auth:', authError);
      throw new Error(`Erro na migração: ${authError.message}`);
    }

    console.log(`Usuário ${email} migrado com sucesso para auth.users`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Usuário migrado com sucesso',
        user_id: authUser.user?.id 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Erro na migração de usuário:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);