import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UpdateUserRequest {
  userId: string;
  nome?: string;
  telefone?: string;
  email?: string;
  cpf?: string;
  funcao?: string;
  equipeId?: string;
  supervisorEquipeId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request data
    const userData: UpdateUserRequest = await req.json();
    console.log('Dados para atualização:', userData);

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Regular client for user verification
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          authorization: req.headers.get('authorization') ?? '',
        },
      },
    });

    // Get current user from JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Erro ao obter usuário:', userError);
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get current user's role and permissions
    const { data: currentUserData, error: currentUserError } = await supabaseAdmin
      .from('usuarios')
      .select('funcao, equipe_id')
      .eq('id', user.id)
      .eq('ativo', true)
      .single();

    if (currentUserError || !currentUserData) {
      console.error('Erro ao buscar dados do usuário atual:', currentUserError);
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check permissions based on user role
    const currentUserRole = currentUserData.funcao;
    const canUpdate = 
      currentUserRole === 'ADMINISTRADOR_GERAL' ||
      (currentUserRole === 'SUPERVISOR' && userData.userId !== user.id) ||
      (currentUserRole === 'SUPERVISOR_EQUIPE' && userData.userId !== user.id) ||
      userData.userId === user.id; // Users can update themselves

    if (!canUpdate) {
      return new Response(
        JSON.stringify({ error: 'Sem permissão para atualizar este usuário' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get user being updated
    const { data: targetUser, error: targetUserError } = await supabaseAdmin
      .from('usuarios')
      .select('email, funcao')
      .eq('id', userData.userId)
      .eq('ativo', true)
      .single();

    if (targetUserError || !targetUser) {
      console.error('Erro ao buscar usuário alvo:', targetUserError);
      return new Response(
        JSON.stringify({ error: 'Usuário a ser atualizado não encontrado' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // If email is being changed, validate uniqueness
    if (userData.email && userData.email.toLowerCase() !== targetUser.email.toLowerCase()) {
      const { data: existingUser } = await supabaseAdmin
        .from('usuarios')
        .select('id')
        .eq('email', userData.email.toLowerCase())
        .neq('id', userData.userId)
        .single();

      if (existingUser) {
        return new Response(
          JSON.stringify({ error: 'Email já está em uso por outro usuário' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Prepare update data for database
    const updateData: any = {};
    if (userData.nome) updateData.nome = userData.nome.toUpperCase();
    if (userData.telefone) updateData.telefone = userData.telefone;
    if (userData.email) updateData.email = userData.email.toLowerCase();
    if (userData.cpf) updateData.cpf = userData.cpf;
    if (userData.funcao) updateData.funcao = userData.funcao;
    if (userData.equipeId !== undefined) updateData.equipe_id = userData.equipeId || null;
    if (userData.supervisorEquipeId !== undefined) updateData.supervisor_equipe_id = userData.supervisorEquipeId || null;

    // Update user in database
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('usuarios')
      .update(updateData)
      .eq('id', userData.userId)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar usuário na base de dados:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar usuário: ' + updateError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // If email or other auth-related data is being updated, sync with Supabase Auth
    if (userData.email || userData.nome || userData.funcao) {
      try {
        const authUpdateData: any = {};
        
        if (userData.email) {
          authUpdateData.email = userData.email.toLowerCase();
        }
        
        // Update user metadata
        authUpdateData.user_metadata = {
          nome: userData.nome?.toUpperCase() || updatedUser.nome,
          funcao: userData.funcao || updatedUser.funcao,
        };

        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          userData.userId,
          authUpdateData
        );

        if (authError) {
          console.error('Erro ao atualizar Auth:', authError);
          // Try to rollback database changes
          await supabaseAdmin
            .from('usuarios')
            .update({
              nome: targetUser.email, // Restore original data
              email: targetUser.email,
              funcao: targetUser.funcao
            })
            .eq('id', userData.userId);
          
          return new Response(
            JSON.stringify({ error: 'Erro ao sincronizar com autenticação: ' + authError.message }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        console.log('Usuário atualizado com sucesso no Auth e DB');
      } catch (error: any) {
        console.error('Erro na sincronização com Auth:', error);
        return new Response(
          JSON.stringify({ error: 'Erro ao sincronizar dados com autenticação' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Convert database format to frontend format
    const formattedUser = {
      id: updatedUser.id,
      nome: updatedUser.nome,
      telefone: updatedUser.telefone,
      email: updatedUser.email,
      cpf: updatedUser.cpf,
      funcao: updatedUser.funcao,
      dataCadastro: updatedUser.data_cadastro,
      ativo: updatedUser.ativo,
      equipeId: updatedUser.equipe_id,
      supervisorEquipeId: updatedUser.supervisor_equipe_id,
    };

    return new Response(
      JSON.stringify(formattedUser),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Erro na Edge Function update-user:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor: ' + error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

Deno.serve(handler);