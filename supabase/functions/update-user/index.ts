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

    // Extract JWT token from Authorization header
    const authHeader = req.headers.get('authorization');
    console.log('Authorization header:', authHeader ? 'presente' : 'ausente');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Token de autorização não encontrado ou formato inválido');
      return new Response(
        JSON.stringify({ error: 'Token de autorização não encontrado' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get current user from JWT using the admin client
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    
    if (userError || !user) {
      console.error('Erro ao obter usuário com JWT:', userError);
      console.error('JWT válido:', jwt ? 'sim' : 'não');
      return new Response(
        JSON.stringify({ 
          error: 'Usuário não autenticado', 
          details: userError?.message 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Usuário autenticado com sucesso:', user.id);

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

    // Get user being updated (include all fields for rollback)
    const { data: targetUser, error: targetUserError } = await supabaseAdmin
      .from('usuarios')
      .select('*')
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
        console.log('Iniciando sincronização com Supabase Auth...');
        
        // Get current user metadata from Auth
        const { data: currentAuthUser } = await supabaseAdmin.auth.admin.getUserById(userData.userId);
        const currentMetadata = currentAuthUser?.user?.user_metadata || {};
        
        console.log('Metadados atuais do Auth:', currentMetadata);
        
        const authUpdateData: any = {};
        
        if (userData.email && userData.email.toLowerCase() !== targetUser.email.toLowerCase()) {
          authUpdateData.email = userData.email.toLowerCase();
          console.log('Atualizando email no Auth:', authUpdateData.email);
        }
        
        // Always update metadata to ensure name appears in Supabase Auth
        authUpdateData.user_metadata = {
          ...currentMetadata,
          nome: userData.nome?.toUpperCase() || updatedUser.nome,
          funcao: userData.funcao || updatedUser.funcao,
        };
        
        console.log('Dados para atualização no Auth:', authUpdateData);

        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          userData.userId,
          authUpdateData
        );

        if (authError) {
          console.error('Erro ao atualizar Auth:', authError);
          console.error('Dados que causaram erro:', authUpdateData);
          
          // Rollback database changes with correct original data
          await supabaseAdmin
            .from('usuarios')
            .update({
              nome: targetUser.nome, // Correct field mapping
              email: targetUser.email,
              funcao: targetUser.funcao,
              telefone: targetUser.telefone,
              cpf: targetUser.cpf,
              equipe_id: targetUser.equipe_id,
              supervisor_equipe_id: targetUser.supervisor_equipe_id
            })
            .eq('id', userData.userId);
          
          return new Response(
            JSON.stringify({ 
              error: 'Erro ao sincronizar com autenticação', 
              details: authError.message 
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        console.log('Usuário atualizado com sucesso no Auth e DB');
        console.log('Metadados finais no Auth:', authUpdateData.user_metadata);
        
      } catch (error: any) {
        console.error('Erro na sincronização com Auth:', error);
        console.error('Stack trace:', error.stack);
        return new Response(
          JSON.stringify({ 
            error: 'Erro ao sincronizar dados com autenticação',
            details: error.message 
          }),
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