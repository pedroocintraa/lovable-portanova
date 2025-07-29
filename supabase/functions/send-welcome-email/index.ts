import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nome, email, funcao }: WelcomeEmailRequest = await req.json();
    
    console.log('Enviando email de boas-vindas para:', email);

    const emailResponse = await resend.emails.send({
      from: "Sistema de Vendas <onboarding@resend.dev>",
      to: [email],
      subject: "Bem-vindo ao Sistema de Vendas!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">Bem-vindo ao Sistema de Vendas!</h1>
          
          <p>Olá <strong>${nome}</strong>,</p>
          
          <p>Sua conta foi criada com sucesso no nosso sistema! Abaixo estão suas credenciais de acesso:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Suas Credenciais:</h3>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Senha Temporária:</strong> <code style="background-color: #e9ecef; padding: 4px 8px; border-radius: 4px; color: #d73527;">Trocar@123</code></p>
            <p><strong>Função:</strong> ${funcao}</p>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #856404;">⚠️ Importante:</h4>
            <p style="margin-bottom: 0; color: #856404;">
              Por motivos de segurança, recomendamos fortemente que você altere sua senha após o primeiro login. 
              Acesse o menu "Change Password" no sistema para definir uma nova senha.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${Deno.env.get('SITE_URL') || 'https://lovable-portanova.lovable.app'}/login" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Acessar Sistema
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          
          <p style="color: #666; font-size: 14px;">
            Se você tiver alguma dúvida ou precisar de ajuda, entre em contato com o administrador do sistema.
          </p>
          
          <p style="color: #666; font-size: 12px; text-align: center;">
            Este é um email automático, não responda a esta mensagem.
          </p>
        </div>
      `,
    });

    console.log("Email de boas-vindas enviado com sucesso:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Erro ao enviar email de boas-vindas:", error);
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