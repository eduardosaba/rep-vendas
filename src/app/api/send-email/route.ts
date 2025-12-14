import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  try {
    const { to, subject, html, text, userId } = await request.json();

    // Validação básica
    if (!to || !subject || (!html && !text)) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: to, subject, html ou text' },
        { status: 400 }
      );
    }

    // Buscar configurações de email do usuário - com resiliência .maybeSingle()
    let settings = null;
    if (userId) {
      const { data } = await supabase
        .from('settings')
        .select('email_provider, email_api_key, email_from')
        .eq('user_id', userId)
        .maybeSingle();

      settings = data;
    }

    // Se não encontrou configurações, usar valores padrão ou simular
    const emailProvider = settings?.email_provider || 'resend';
    const apiKey = settings?.email_api_key;
    const fromEmail = settings?.email_from || 'noreply@repvendas.com';

    // Se não há chave API configurada, simular envio
    if (!apiKey) {
      console.log('📧 Email simulado (sem chave API configurada):', {
        from: fromEmail,
        to,
        subject,
        html: html?.substring(0, 100) + '...',
        text: text?.substring(0, 100) + '...',
        provider: emailProvider,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message:
          'Email enviado com sucesso (simulado - configure chave API para envio real)',
        messageId: `sim_${Date.now()}`,
      });
    }

    // Integração real com provedores de email
    let result;

    switch (emailProvider) {
      case 'resend':
        result = await sendWithResend(
          apiKey,
          fromEmail,
          to,
          subject,
          html,
          text
        );
        break;
      case 'sendgrid':
        result = await sendWithSendGrid(
          apiKey,
          fromEmail,
          to,
          subject,
          html,
          text
        );
        break;
      case 'mailgun':
        result = await sendWithMailgun(
          apiKey,
          fromEmail,
          to,
          subject,
          html,
          text
        );
        break;
      default:
        // Fallback para simulação
        console.log('📧 Email enviado (provedor não suportado):', {
          provider: emailProvider,
          from: fromEmail,
          to,
          subject,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json({
          success: true,
          message: `Email enviado via ${emailProvider} (simulado)`,
          messageId: `prov_${Date.now()}`,
        });
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Email enviado com sucesso',
        messageId: result.messageId,
      });
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Função para envio via Resend
async function sendWithResend(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html?: string,
  text?: string
) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        text,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erro no Resend');
    }

    return { success: true, messageId: data.id };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// Função para envio via SendGrid
async function sendWithSendGrid(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html?: string,
  text?: string
) {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: to }],
          },
        ],
        from: { email: from },
        subject,
        content: [
          ...(text ? [{ type: 'text/plain', value: text }] : []),
          ...(html ? [{ type: 'text/html', value: html }] : []),
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Erro no SendGrid');
    }

    return {
      success: true,
      messageId: response.headers.get('x-message-id') || `sg_${Date.now()}`,
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// Função para envio via Mailgun
async function sendWithMailgun(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html?: string,
  text?: string
) {
  try {
    const domain = from.split('@')[1]; // Extrair domínio do email
    const response = await fetch(
      `https://api.mailgun.net/v3/${domain}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          from,
          to,
          subject,
          ...(text && { text }),
          ...(html && { html }),
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erro no Mailgun');
    }

    return { success: true, messageId: data.id };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
