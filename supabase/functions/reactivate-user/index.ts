import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Starting reactivate-user Edge Function")

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

    console.log(`Reativando usuário: ${userId}`)

    // Reativar na tabela usuarios
    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ ativo: true })
      .eq('id', userId)

    if (updateError) {
      console.error('Erro ao reativar usuário na tabela:', updateError)
      return new Response(
        JSON.stringify({ error: 'Erro ao reativar usuário' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Reativar no auth.users usando service role
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { banned: false }
    })

    if (authError) {
      console.warn('Aviso ao reativar no auth:', authError)
      // Não falha a operação se o auth der erro
    }

    console.log(`Usuário ${userId} reativado com sucesso`)

    return new Response(
      JSON.stringify({ success: true, message: 'Usuário reativado com sucesso' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Erro na Edge Function reactivate-user:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})