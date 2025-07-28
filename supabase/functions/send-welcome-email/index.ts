import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  usuario_id: string;
  nome: string;
  email: string;
  funcao: string;
}

const getFuncaoDisplay = (funcao: string): string => {
  const funcoes: Record<string, string> = {
    'ADMINISTRADOR_GERAL': 'Administrador Geral',
    'SUPERVISOR': 'Supervisor',
    'SUPERVISOR_EQUIPE': 'Supervisor de Equipe', 
    'VENDEDOR': 'Vendedor'
  };
  return funcoes[funcao] || funcao;
};

const generateWelcomeEmailHTML = (nome: string, funcao: string): string => {
  const funcaoDisplay = getFuncaoDisplay(funcao);
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Bem-vindo ao Sistema de Vendas</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
          .content { padding: 40px 30px; }
          .welcome-text { font-size: 18px; color: #2d3748; margin-bottom: 20px; }
          .info-box { background-color: #f7fafc; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px; }
          .info-title { font-weight: 600; color: #2d3748; margin-bottom: 10px; }
          .info-text { color: #4a5568; line-height: 1.6; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .footer { background-color: #f7fafc; padding: 20px 30px; text-align: center; color: #718096; font-size: 14px; }
          .highlight { color: #667eea; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Bem-vindo ao Sistema de Vendas!</h1>
          </div>
          
          <div class="content">
            <p class="welcome-text">Olá <span class="highlight">${nome}</span>,</p>
            
            <p class="info-text">
              Seja muito bem-vindo(a) ao nosso Sistema de Vendas! Sua conta foi criada com sucesso e você já pode começar a utilizar a plataforma.
            </p>

            <div class="info-box">
              <div class="info-title">📋 Informações da sua conta:</div>
              <div class="info-text">
                <strong>Nome:</strong> ${nome}<br>
                <strong>Função:</strong> ${funcaoDisplay}<br>
                <strong>Status:</strong> Ativo
              </div>
            </div>

            <div class="info-box">
              <div class="info-title">🚀 Próximos passos:</div>
              <div class="info-text">
                1. Acesse o sistema usando seu email cadastrado<br>
                2. Configure sua senha de acesso<br>
                3. Explore as funcionalidades disponíveis para seu perfil<br>
                4. Entre em contato com seu supervisor para orientações específicas
              </div>
            </div>

            <div class="info-box">
              <div class="info-title">❓ Precisa de ajuda?</div>
              <div class="info-text">
                Nossa equipe de suporte está sempre pronta para ajudar! Entre em contato através dos canais de comunicação da empresa ou fale com seu supervisor direto.
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>Esta é uma mensagem automática do Sistema de Vendas.</p>
            <p>© ${new Date().getFullYear()} Sistema de Vendas - Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { usuario_id, nome, email, funcao }: WelcomeEmailRequest = await req.json();

    console.log(`Enviando email de boas-vindas para: ${nome} (${email}) - Função: ${funcao}`);

    const emailHTML = generateWelcomeEmailHTML(nome, funcao);

    const emailResponse = await resend.emails.send({
      from: "Sistema de Vendas <onboarding@resend.dev>",
      to: [email],
      subject: "🎉 Bem-vindo ao Sistema de Vendas!",
      html: emailHTML,
    });

    console.log("Email enviado com sucesso:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Email de boas-vindas enviado com sucesso",
      email_id: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Erro ao enviar email de boas-vindas:", error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      message: "Falha ao enviar email de boas-vindas"
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json", 
        ...corsHeaders 
      },
    });
  }
};

serve(handler);