import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Criar cliente admin do Supabase
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const adminEmail = 'pedroocintraa20@gmail.com'
    const adminPassword = 'Trocar@123'

    console.log(`Iniciando criação do usuário administrador: ${adminEmail}`)

    // Verificar se o usuário já existe na tabela usuarios
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('usuarios')
      .select('id, email, nome')
      .eq('email', adminEmail)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Erro ao verificar usuário existente:', checkError)
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar usuário existente' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!existingUser) {
      console.error('Usuário não encontrado na tabela usuarios')
      return new Response(
        JSON.stringify({ error: 'Usuário PEDRO CINTRA não encontrado na base de dados' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Usuário encontrado na tabela: ${existingUser.nome}`)

    // Verificar se já existe no Auth
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    const existingAuthUser = authUsers?.users?.find(user => user.email === adminEmail)

    if (existingAuthUser) {
      console.log('Usuário já existe no Auth, vinculando IDs...')
      
      // Atualizar o ID na tabela usuarios
      const { error: updateError } = await supabaseAdmin
        .from('usuarios')
        .update({ id: existingAuthUser.id })
        .eq('email', adminEmail)

      if (updateError) {
        console.error('Erro ao vincular IDs:', updateError)
        return new Response(
          JSON.stringify({ error: 'Erro ao vincular usuário existente' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          user: existingAuthUser,
          message: 'Admin já existia e foi vinculado com sucesso' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar usuário no Auth
    console.log('Criando usuário no Supabase Auth...')
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        nome: existingUser.nome
      }
    })

    if (authError) {
      console.error('Erro ao criar usuário no Auth:', authError)
      return new Response(
        JSON.stringify({ error: `Erro no Auth: ${authError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Usuário criado no Auth com ID: ${authUser.user.id}`)

    // Atualizar o usuário na tabela usuarios com o ID do Auth
    const { error: updateError } = await supabaseAdmin
      .from('usuarios')
      .update({ id: authUser.user.id })
      .eq('email', adminEmail)

    if (updateError) {
      console.error('Erro ao atualizar usuário na tabela:', updateError)
      
      // Tentar deletar o usuário do Auth se não conseguiu linkar
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
        console.log('Usuário removido do Auth devido a erro de vinculação')
      } catch (deleteError) {
        console.error('Erro ao deletar usuário do Auth:', deleteError)
      }
      
      return new Response(
        JSON.stringify({ error: `Erro ao vincular usuário: ${updateError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Usuário administrador criado e vinculado com sucesso!')

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: authUser.user,
        message: 'Admin criado e vinculado com sucesso' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Erro geral:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})