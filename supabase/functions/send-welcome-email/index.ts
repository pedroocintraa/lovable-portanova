import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// Configuração SMTP
const client = new SMTPClient({
  connection: {
    hostname: Deno.env.get("SMTP_HOST") || "smtp.gmail.com",
    port: parseInt(Deno.env.get("SMTP_PORT") || "587"),
    tls: true,
    auth: {
      username: Deno.env.get("SMTP_USER") || "",
      password: Deno.env.get("SMTP_PASS") || "",
    },
  },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  usuario_id: string;
  nome: string;
  email: string;
  funcao: string;
  senha_temporaria?: string;
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

const generateWelcomeEmailHTML = (nome: string, funcao: string, senhaTemporaria?: string): string => {
  const funcaoDisplay = getFuncaoDisplay(funcao);
  const sistemaUrl = "https://leyeltbhwuxssawmhqcb.supabase.co"; // URL base do sistema
  
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
          .access-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; text-align: center; font-size: 16px; }
          .password-box { background-color: #edf2f7; border: 2px dashed #cbd5e0; padding: 20px; margin: 15px 0; border-radius: 8px; text-align: center; }
          .password-code { font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 18px; font-weight: bold; color: #2d3748; background-color: #white; padding: 10px 15px; border-radius: 4px; border: 1px solid #cbd5e0; display: inline-block; letter-spacing: 1px; }
          .warning-box { background-color: #fef5e7; border-left: 4px solid #f6ad55; padding: 20px; margin: 20px 0; border-radius: 4px; }
          .footer { background-color: #f7fafc; padding: 20px 30px; text-align: center; color: #718096; font-size: 14px; }
          .highlight { color: #667eea; font-weight: 600; }
          .step-number { background-color: #667eea; color: white; border-radius: 50%; width: 25px; height: 25px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 10px; }
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

            <div style="text-align: center; margin: 30px 0;">
              <a href="${sistemaUrl}" class="access-button">🚀 Acessar Sistema Agora</a>
            </div>

            <div class="info-box">
              <div class="info-title">📋 Suas credenciais de acesso:</div>
              <div class="info-text">
                <strong>Email:</strong> ${nome.split(' ')[0].toLowerCase()}@sistemavendas.com<br>
                <strong>Função:</strong> ${funcaoDisplay}<br>
                <strong>Status:</strong> Ativo
              </div>
              ${senhaTemporaria ? `
                <div class="password-box">
                  <div style="margin-bottom: 10px; font-weight: 600;">🔒 Sua senha temporária:</div>
                  <div class="password-code">${senhaTemporaria}</div>
                  <div style="margin-top: 10px; font-size: 14px; color: #718096;">
                    Copie esta senha para fazer seu primeiro acesso
                  </div>
                </div>
              ` : ''}
            </div>

            <div class="warning-box">
              <div class="info-title">⚠️ Importante - Segurança:</div>
              <div class="info-text">
                Por segurança, você <strong>deve trocar esta senha</strong> no primeiro acesso ao sistema. 
                Nunca compartilhe suas credenciais com outras pessoas.
              </div>
            </div>

            <div class="info-box">
              <div class="info-title">🚀 Como fazer seu primeiro acesso:</div>
              <div class="info-text">
                <div style="margin-bottom: 10px;"><span class="step-number">1</span>Clique no botão "Acessar Sistema" acima</div>
                <div style="margin-bottom: 10px;"><span class="step-number">2</span>Digite seu email de acesso</div>
                <div style="margin-bottom: 10px;"><span class="step-number">3</span>Use a senha temporária fornecida acima</div>
                <div style="margin-bottom: 10px;"><span class="step-number">4</span>Defina sua nova senha pessoal</div>
                <div style="margin-bottom: 10px;"><span class="step-number">5</span>Explore o sistema e suas funcionalidades</div>
              </div>
            </div>

            <div class="info-box">
              <div class="info-title">❓ Precisa de ajuda?</div>
              <div class="info-text">
                Nossa equipe de suporte está sempre pronta para ajudar! Entre em contato através dos canais de comunicação da empresa ou fale com seu supervisor direto.
                <br><br>
                <strong>Suporte técnico:</strong> suporte@sistemavendas.com<br>
                <strong>Dúvidas gerais:</strong> Fale com seu supervisor
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>Esta é uma mensagem automática do Sistema de Vendas.</p>
            <p>© ${new Date().getFullYear()} Sistema de Vendas - Todos os direitos reservados.</p>
            <p style="margin-top: 10px; font-size: 12px;">
              Este email contém informações confidenciais. Se você recebeu por engano, delete-o imediatamente.
            </p>
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
    const { usuario_id, nome, email, funcao, senha_temporaria }: WelcomeEmailRequest = await req.json();

    console.log(`Enviando email de boas-vindas para: ${nome} (${email}) - Função: ${funcao}`);
    console.log(`Senha temporária incluída: ${senha_temporaria ? 'Sim' : 'Não'}`);

    const emailHTML = generateWelcomeEmailHTML(nome, funcao, senha_temporaria);

    // Verificar se as configurações SMTP estão definidas
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");
    
    if (!smtpUser || !smtpPass) {
      throw new Error("Configurações SMTP não encontradas. Configure SMTP_USER e SMTP_PASS.");
    }

    // Enviar email via SMTP
    await client.send({
      from: `${Deno.env.get("SMTP_FROM_NAME") || "Sistema de Vendas"} <${smtpUser}>`,
      to: email,
      subject: "🎉 Bem-vindo ao Sistema de Vendas!",
      html: emailHTML,
    });

    console.log("Email enviado com sucesso via SMTP para:", email);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Email de boas-vindas enviado com sucesso via SMTP",
      recipient: email
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