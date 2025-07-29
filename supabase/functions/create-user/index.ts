import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  nome: string;
  telefone: string;
  email: string;
  cpf: string;
  funcao: string;
  equipeId?: string;
  supervisorEquipeId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user data from request
    const userData: CreateUserRequest = await req.json();
    
    console.log('Iniciando criação de usuário:', userData.email);

    // Create admin client using service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create regular client to verify current user permissions
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Verify current user has permission to create users
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) {
      console.error('Usuário não autenticado');
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get current user's role
    const { data: currentUserData } = await supabase
      .from('usuarios')
      .select('funcao')
      .eq('id', currentUser.user.id)
      .eq('ativo', true)
      .single();

    if (!currentUserData) {
      console.error('Usuário atual não encontrado na tabela usuarios');
      return new Response(
        JSON.stringify({ error: "Usuário atual não encontrado" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check permissions based on current user's role
    const canCreateUser = currentUserData.funcao === 'ADMINISTRADOR_GERAL' ||
      (currentUserData.funcao === 'SUPERVISOR' && ['VENDEDOR', 'SUPERVISOR_EQUIPE'].includes(userData.funcao)) ||
      (currentUserData.funcao === 'SUPERVISOR_EQUIPE' && userData.funcao === 'VENDEDOR');

    if (!canCreateUser) {
      console.error('Usuário sem permissão para criar usuário com essa função');
      return new Response(
        JSON.stringify({ error: "Sem permissão para criar usuário com essa função" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email uniqueness
    const { data: existingEmailUser } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('email', userData.email)
      .single();

    if (existingEmailUser) {
      console.error('Email já existe:', userData.email);
      return new Response(
        JSON.stringify({ error: "Email já está em uso" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate CPF uniqueness
    const { data: existingCpfUser } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('cpf', userData.cpf)
      .single();

    if (existingCpfUser) {
      console.error('CPF já existe:', userData.cpf);
      return new Response(
        JSON.stringify({ error: "CPF já está em uso" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create user with auto-confirmed email using Supabase Auth admin API
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: 'Trocar@123',
      email_confirm: true, // Auto-confirm email to bypass email sending issues
      user_metadata: {
        nome: userData.nome.toUpperCase(),
        funcao: userData.funcao,
        isNewUser: true
      }
    });

    if (authError) {
      console.error('Erro ao criar usuário no Auth:', authError);
      return new Response(
        JSON.stringify({ error: `Erro ao criar usuário no Auth: ${authError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('Usuário criado no Auth:', authUser.user.id);

    // Insert user data into usuarios table
    const { data: dbUser, error: dbError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        id: authUser.user.id,
        nome: userData.nome.toUpperCase(),
        telefone: userData.telefone,
        email: userData.email,
        cpf: userData.cpf,
        funcao: userData.funcao,
        equipe_id: userData.equipeId || null,
        supervisor_equipe_id: userData.supervisorEquipeId || null,
        ativo: true,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Erro ao inserir usuário na tabela:', dbError);
      
      // If database insert fails, delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      
      return new Response(
        JSON.stringify({ error: `Erro ao salvar dados do usuário: ${dbError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('Usuário criado com sucesso:', dbUser.id);

    // Log audit trail
    console.log(`Usuário criado por: ${currentUser.user.id} (${currentUserData.funcao})`);
    console.log(`Novo usuário: ${dbUser.id} - ${dbUser.nome} (${dbUser.funcao})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: dbUser,
        emailConfirmed: true,
        credentials: {
          email: dbUser.email,
          senha: "Trocar@123"
        },
        message: `Usuário ${dbUser.nome} criado com sucesso! Email auto-confirmado. Credenciais: ${dbUser.email} | Senha: Trocar@123`
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Erro na criação de usuário:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);