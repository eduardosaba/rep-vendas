import { MessageCircle } from 'lucide-react';
import { makeWhatsAppUrl } from '@/lib/format-whatsapp';

export function SupportButton() {
  // Troque pelo seu número
  const whatsappNumber = '5575981272323';
  const message = 'Olá, preciso de ajuda com o RepVendas.';
  const href = makeWhatsAppUrl(whatsappNumber, message) || makeWhatsAppUrl(String(whatsappNumber || '').replace(/\D/g, '')) || '#';

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition-all hover:scale-105 font-medium p-3 min-h-[44px] min-w-[44px]"
    >
      <MessageCircle size={24} />
      <span className="hidden md:inline">Suporte</span>
    </a>
  );
}
