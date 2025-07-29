import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteUserRequest {
  userId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar método HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }), 
        { status: 405, headers: corsHeaders }
      );
    }

    // Obter token de autorização
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }), 
        { status: 401, headers: corsHeaders }
      );
    }

    // Inicializar clientes Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Cliente para operações de usuário (com JWT do usuário)
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } }
    });
    
    // Cliente para operações administrativas (service role)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Verificar se o usuário está autenticado
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error('❌ Erro de autenticação:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: corsHeaders }
      );
    }

    // Verificar se o usuário é administrador geral
    const { data: currentUser, error: userError } = await supabaseUser
      .from('usuarios')
      .select('funcao, nome, email')
      .eq('id', user.id)
      .eq('ativo', true)
      .single();

    if (userError || !currentUser || currentUser.funcao !== 'ADMINISTRADOR_GERAL') {
      console.error('❌ Usuário não autorizado:', { userError, currentUser });
      return new Response(
        JSON.stringify({ error: 'Only general administrators can permanently delete users' }), 
        { status: 403, headers: corsHeaders }
      );
    }

    // Obter dados da requisição
    const { userId }: DeleteUserRequest = await req.json();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }), 
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`🗑️ Admin ${currentUser.nome} iniciando exclusão permanente do usuário: ${userId}`);

    // Buscar usuário alvo (independente do status ativo)
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single();

    if (targetError) {
      if (targetError.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'User not found' }), 
          { status: 404, headers: corsHeaders }
        );
      }
      throw targetError;
    }

    console.log(`📋 Usuário encontrado: ${targetUser.nome} (${targetUser.email}) - Ativo: ${targetUser.ativo}`);

    // Verificar se não é o último administrador geral ATIVO
    if (targetUser.funcao === 'ADMINISTRADOR_GERAL' && targetUser.ativo) {
      const { data: activeAdmins, error: adminError } = await supabaseAdmin
        .from('usuarios')
        .select('id')
        .eq('funcao', 'ADMINISTRADOR_GERAL')
        .eq('ativo', true);

      if (adminError) {
        throw adminError;
      }

      if (activeAdmins && activeAdmins.length <= 1) {
        console.error('❌ Tentativa de excluir último admin ativo');
        return new Response(
          JSON.stringify({ error: 'Cannot delete the last active general administrator' }), 
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Verificar se existe no Supabase Auth
    const { data: authUser, error: authCheckError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    let deletedFromAuth = false;
    if (authUser?.user && !authCheckError) {
      // Excluir do Supabase Auth
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authDeleteError) {
        console.error('❌ Erro ao excluir do Auth:', authDeleteError);
        throw new Error(`Failed to delete user from authentication: ${authDeleteError.message}`);
      }
      deletedFromAuth = true;
      console.log('✅ Usuário excluído do Supabase Auth');
    } else {
      console.log('⚠️ Usuário não existe no Supabase Auth (usuário órfão)');
    }

    // Excluir da tabela usuarios
    const { error: dbDeleteError } = await supabaseAdmin
      .from('usuarios')
      .delete()
      .eq('id', userId);

    if (dbDeleteError) {
      console.error('❌ Erro ao excluir do banco:', dbDeleteError);
      
      // Se já excluiu do Auth, tenta reverter (se possível)
      if (deletedFromAuth) {
        console.error('⚠️ ATENÇÃO: Usuário foi excluído do Auth mas não do banco. Estado inconsistente!');
      }
      
      throw new Error(`Failed to delete user from database: ${dbDeleteError.message}`);
    }

    console.log(`🎉 Usuário ${targetUser.nome} excluído permanentemente com sucesso`);

    // Log de auditoria
    try {
      await supabaseAdmin.rpc('log_security_event', {
        p_action: 'USER_PERMANENTLY_DELETED',
        p_table_name: 'usuarios',
        p_record_id: userId,
        p_old_values: targetUser,
        p_new_values: null
      });
    } catch (logError) {
      console.error('⚠️ Erro ao registrar log de auditoria:', logError);
      // Não falha a operação por causa do log
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${targetUser.nome} permanently deleted successfully`,
        deletedFromAuth,
        deletedFromDatabase: true
      }), 
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('❌ Erro na Edge Function delete-user:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }), 
      { status: 500, headers: corsHeaders }
    );
  }
});