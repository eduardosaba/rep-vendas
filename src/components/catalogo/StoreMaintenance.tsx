import { Power, MessageCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface StoreMaintenanceProps {
  storeName: string;
  phone?: string;
}

export function StoreMaintenance({ storeName, phone }: StoreMaintenanceProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-[3rem] p-10 shadow-xl border border-gray-100 animate-in zoom-in-95 duration-500">
        <div className="relative mx-auto mb-8 w-24 h-24">
          <div className="absolute inset-0 bg-rose-100 rounded-full animate-pulse opacity-50" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-rose-50 text-rose-500 shadow-inner">
            <Clock size={48} strokeWidth={1.5} />
          </div>
        </div>

        <h1 className="text-3xl font-black text-secondary mb-4 tracking-tight">
          Voltamos em breve!
        </h1>

        <p className="text-gray-500 text-lg mb-8 leading-relaxed">
          A loja <strong>{storeName}</strong> está passando por uma atualização
          no catálogo ou uma breve manutenção.
        </p>

        <div className="space-y-4">
          {phone && (
            <a
              href={`https://wa.me/55${phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-2xl font-black text-lg shadow-lg transition-all hover:-translate-y-1 flex items-center justify-center gap-3"
            >
              <MessageCircle size={24} />
              Falar via WhatsApp
            </a>
          )}

          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
            Agradecemos a compreensão
          </p>
        </div>
      </div>
    </div>
  );
}
