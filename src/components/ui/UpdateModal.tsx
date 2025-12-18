'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Rocket, Gift, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function UpdateModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [updateData, setUpdateData] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    const checkUpdates = async () => {
      // 1. Busca a ÚLTIMA atualização ativa no banco
      const { data, error } = await supabase
        .from('system_updates')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return;

      // 2. Verifica se o usuário já viu ESTA versão específica
      const seenVersion = localStorage.getItem('app_last_seen_version');

      if (seenVersion !== data.version) {
        setUpdateData(data);
        setIsOpen(true);
      }
    };

    checkUpdates();
  }, []);

  const handleClose = () => {
    if (updateData) {
      localStorage.setItem('app_last_seen_version', updateData.version);
    }
    setIsOpen(false);
  };

  const getIcon = (type: string) => {
    if (type === 'new') return <Rocket className="text-purple-500" size={20} />;
    if (type === 'improvement')
      return <Gift className="text-green-500" size={20} />;
    return <Wrench className="text-orange-500" size={20} />;
  };

  if (!isOpen || !updateData) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white text-center relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/20 rounded-full p-1 transition-colors"
          >
            <X size={20} />
          </button>
          <Rocket className="mx-auto mb-3 h-12 w-12 text-white/90" />
          <h2 className="text-2xl font-bold">{updateData.title}</h2>
          <p className="text-indigo-100 text-sm">Versão {updateData.version}</p>
        </div>

        {/* Imagem Opcional */}
        {updateData.image_url && (
          <div className="w-full h-40 relative">
            <img
              src={updateData.image_url}
              alt="Novidade"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Lista de Mudanças */}
        <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
          {updateData.items?.map((item: any, idx: number) => (
            <div key={idx} className="flex gap-4">
              <div className="mt-1 shrink-0 bg-gray-50 dark:bg-slate-800 p-2 rounded-lg h-fit">
                {getIcon(item.type)}
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {item.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 pt-0">
          <Button
            onClick={handleClose}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Entendi, vamos lá!
          </Button>
        </div>
      </div>
    </div>
  );
}
