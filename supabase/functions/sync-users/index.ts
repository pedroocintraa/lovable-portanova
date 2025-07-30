import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Starting sync-users Edge Function")

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

    console.log('Iniciando sincronização de usuários entre CRM e Auth')

    // Obter todos os usuários do CRM
    const { data: usuariosCRM, error: crmError } = await supabase
      .from('usuarios')
      .select('id, email, nome')

    if (crmError) {
      console.error('Erro ao obter usuários do CRM:', crmError)
      return new Response(
        JSON.stringify({ error: 'Erro ao obter usuários do CRM' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!usuariosCRM || usuariosCRM.length === 0) {
      return new Response(
        JSON.stringify({ removidos: 0, erros: [], message: 'Nenhum usuário encontrado no CRM' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    let removidos = 0
    const erros: string[] = []

    // Verificar cada usuário do CRM no Auth
    for (const usuario of usuariosCRM) {
      try {
        console.log(`Verificando usuário: ${usuario.nome} (${usuario.email})`)
        
        const { data: authUser, error: getUserError } = await supabase.auth.admin.getUserById(usuario.id)
        
        if (getUserError || !authUser.user) {
          console.log(`Usuário ${usuario.nome} não existe no Auth, removendo do CRM`)
          
          // Usuário não existe no Supabase Auth, remover do CRM
          const { error: deleteError } = await supabase
            .from('usuarios')
            .delete()
            .eq('id', usuario.id)

          if (deleteError) {
            const errorMsg = `Erro ao remover ${usuario.nome} (${usuario.email}): ${deleteError.message}`
            erros.push(errorMsg)
            console.error(errorMsg)
          } else {
            removidos++
            console.log(`✅ Usuário ${usuario.nome} removido por inconsistência`)
          }
        } else {
          console.log(`✅ Usuário ${usuario.nome} está consistente`)
        }
      } catch (error: any) {
        const errorMsg = `Erro ao verificar ${usuario.nome}: ${error.message}`
        erros.push(errorMsg)
        console.error(errorMsg)
      }
    }

    console.log(`Sincronização concluída: ${removidos} usuários removidos, ${erros.length} erros`)

    return new Response(
      JSON.stringify({ 
        removidos, 
        erros,
        message: `Sincronização concluída: ${removidos} usuários removidos` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Erro na Edge Function sync-users:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})