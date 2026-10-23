/**
 * Serviço de Notificação em Tempo Real via Telegram Bot para o RepVendas
 * Envia alertas imediatos quando novos leads ou cadastros ocorrem na plataforma.
 */

interface LeadNotificationData {
  name: string;
  email: string;
  phone: string;
  acting_type?: string | null;
  company_name?: string | null;
  source?: string | null;
}

interface SignupNotificationData {
  userId: string;
  name?: string | null;
  email: string;
  phone?: string | null;
  company_name?: string | null;
  estados?: string[] | null;
}

const DEFAULT_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8938889345:AAF0CYbj4qijE-DF6-5QAlaPEiEAC3Qt6aA';
const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '7708716604';

/**
 * Envia mensagem genérica para o Telegram do administrador
 */
export async function sendTelegramMessage(text: string, chatIdInput?: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
  const chatId = chatIdInput || process.env.TELEGRAM_CHAT_ID || DEFAULT_CHAT_ID;

  if (!token || !chatId) {
    console.warn('[telegram:warn] Bot token ou chat_id não configurados.');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[telegram:error] Falha ao enviar mensagem:', err);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[telegram:exception] Erro na requisição do Telegram:', error);
    return false;
  }
}

/**
 * Notifica quando um novo lead preenche a Landing Page
 */
export async function notifyLeadCaptured(lead: LeadNotificationData): Promise<void> {
  try {
    const rawDigits = (lead.phone || '').replace(/\D/g, '');
    const cleanPhone = rawDigits.startsWith('55') ? rawDigits : `55${rawDigits}`;
    const waLink = rawDigits.length >= 10 ? `https://wa.me/${cleanPhone}` : null;

    const message = `
🚀 <b>NOVO LEAD CAPTURADO NO REPVENDAS!</b>

👤 <b>Nome:</b> ${escapeHtml(lead.name || 'Não informado')}
📧 <b>E-mail:</b> ${escapeHtml(lead.email || 'Não informado')}
📱 <b>WhatsApp:</b> ${escapeHtml(lead.phone || 'Não informado')}
🏢 <b>Empresa:</b> ${escapeHtml(lead.company_name || 'Autônomo')}
📍 <b>Atuação:</b> ${escapeHtml(lead.acting_type || 'Representante')}
🌐 <b>Origem:</b> ${escapeHtml(lead.source || 'Landing Page')}

${waLink ? `👉 <a href="${waLink}"><b>CLIQUE AQUI PARA CHAMAR NO WHATSAPP</b></a>` : ''}
    `.trim();

    await sendTelegramMessage(message);
  } catch (err) {
    console.warn('[telegram:notifyLeadCaptured:warn]', err);
  }
}

/**
 * Notifica quando uma nova conta de usuário é criada (Signup finalizado)
 */
export async function notifyUserRegistered(user: SignupNotificationData): Promise<void> {
  try {
    const rawDigits = (user.phone || '').replace(/\D/g, '');
    const cleanPhone = rawDigits.startsWith('55') ? rawDigits : `55${rawDigits}`;
    const waLink = rawDigits.length >= 10 ? `https://wa.me/${cleanPhone}` : null;

    const message = `
🎉 <b>NOVA CONTA CRIADA NO REPVENDAS!</b>

👤 <b>Nome:</b> ${escapeHtml(user.name || 'Novo Usuário')}
📧 <b>E-mail:</b> ${escapeHtml(user.email)}
📱 <b>WhatsApp:</b> ${escapeHtml(user.phone || 'Não informado')}
🏢 <b>Empresa/Loja:</b> ${escapeHtml(user.company_name || 'Comercial')}
🌎 <b>Estados:</b> ${escapeHtml(user.estados?.join(', ') || 'N/A')}
⏳ <b>Período:</b> 14 dias de Teste Gratuito Iniciado

${waLink ? `👉 <a href="${waLink}"><b>ENTRAR EM CONTATO NO WHATSAPP</b></a>` : ''}
    `.trim();

    await sendTelegramMessage(message);
  } catch (err) {
    console.warn('[telegram:notifyUserRegistered:warn]', err);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
