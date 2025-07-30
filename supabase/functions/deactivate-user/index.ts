import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Starting deactivate-user Edge Function")

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { userId } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Desativando usuário: ${userId}`)

    // Verificar se é o último admin
    const { data: admins, error: adminsError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('funcao', 'ADMINISTRADOR_GERAL')
      .eq('ativo', true)

    if (adminsError) {
      console.error('Erro ao verificar admins:', adminsError)
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar administradores' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verificar se o usuário a ser desativado é admin
    const { data: user, error: userError } = await supabase
      .from('usuarios')
      .select('funcao')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('Erro ao obter usuário:', userError)
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (user.funcao === 'ADMINISTRADOR_GERAL' && admins.length <= 1) {
      return new Response(
        JSON.stringify({ error: 'Não é possível desativar o último administrador geral do sistema' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Desativar na tabela usuarios
    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ ativo: false })
      .eq('id', userId)

    if (updateError) {
      console.error('Erro ao desativar usuário na tabela:', updateError)
      return new Response(
        JSON.stringify({ error: 'Erro ao desativar usuário' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Desativar no auth.users usando service role
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { banned: true }
    })

    if (authError) {
      console.warn('Aviso ao desativar no auth:', authError)
      // Não falha a operação se o auth der erro
    }

    console.log(`Usuário ${userId} desativado com sucesso`)

    return new Response(
      JSON.stringify({ success: true, message: 'Usuário desativado com sucesso' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Erro na Edge Function deactivate-user:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})