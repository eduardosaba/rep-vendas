import { MessageCircle } from 'lucide-react';

export function SupportButton() {
  // Troque pelo seu número
  const whatsappNumber = '5575981272323';
  const message = encodeURIComponent('Olá, preciso de ajuda com o RepVendas.');

  return (
    <a
      href={`https://wa.me/${whatsappNumber}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition-all hover:scale-105 font-medium p-3 min-h-[44px] min-w-[44px]"
    >
      <MessageCircle size={24} />
      <span className="hidden md:inline">Suporte</span>
    </a>
  );
}
