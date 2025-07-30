import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    console.log('Iniciando migração em massa de usuários...');

    // Buscar todos os usuários ativos da tabela usuarios
    const { data: usuarios, error: usuariosError } = await supabaseAdmin
      .from('usuarios')
      .select('id, email, nome, funcao, ativo')
      .eq('ativo', true);

    if (usuariosError) {
      console.error('Erro ao buscar usuários:', usuariosError);
      throw new Error(`Erro ao buscar usuários: ${usuariosError.message}`);
    }

    console.log(`Encontrados ${usuarios?.length || 0} usuários para migrar`);

    const resultados = {
      total: usuarios?.length || 0,
      migrados: 0,
      ja_existiam: 0,
      erros: [] as string[]
    };

    // Processar cada usuário
    for (const usuario of usuarios || []) {
      try {
        console.log(`Processando usuário: ${usuario.nome} (${usuario.email})`);

        // Verificar se o usuário já existe no auth.users
        const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(usuario.id);
        
        if (existingUser.user) {
          console.log(`Usuário ${usuario.email} já existe no auth.users`);
          resultados.ja_existiam++;
          continue;
        }

        // Criar usuário no auth.users com o mesmo ID da tabela usuarios
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          user_id: usuario.id, // Usar o mesmo ID
          email: usuario.email,
          password: 'senha123', // Senha padrão temporária
          email_confirm: true,
          user_metadata: {
            nome: usuario.nome,
            funcao: usuario.funcao,
            migrated: true,
            migration_date: new Date().toISOString()
          }
        });

        if (authError) {
          console.error(`Erro ao migrar usuário ${usuario.email}:`, authError);
          resultados.erros.push(`${usuario.email}: ${authError.message}`);
          continue;
        }

        console.log(`✅ Usuário ${usuario.email} migrado com sucesso`);
        resultados.migrados++;

      } catch (error: any) {
        console.error(`Erro ao processar usuário ${usuario.email}:`, error);
        resultados.erros.push(`${usuario.email}: ${error.message}`);
      }
    }

    console.log('Migração concluída:', resultados);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Migração de usuários concluída',
        resultados
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Erro na migração em massa:', error);
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