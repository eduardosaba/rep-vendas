'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Play,
  Pause,
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  reference_code: string | null;
  external_image_url: string;
}

type Status = 'idle' | 'processing' | 'success' | 'error';

interface ProcessItem extends Product {
  status: Status;
  message?: string;
}

export default function ManageExternalImagesClient({
  initialProducts,
}: {
  initialProducts: Product[];
}) {
  const [items, setItems] = useState<ProcessItem[]>(
    initialProducts.map((p) => ({ ...p, status: 'idle' }))
  );

  const [visibleTooltips, setVisibleTooltips] = useState<
    Record<string, boolean>
  >({});
  const showTooltip = (key: string) => {
    setVisibleTooltips((prev) => ({ ...prev, [key]: true }));
    setTimeout(
      () => setVisibleTooltips((prev) => ({ ...prev, [key]: false })),
      2000
    );
  };

  const [isProcessing, setIsProcessing] = useState(false);
  const [stopRequested, setStopRequested] = useState(false);
  const [progress, setProgress] = useState(0);

  const supabase = createClient();

  // Função para baixar a imagem (Fetch do navegador)
  const downloadImage = async (url: string): Promise<Blob> => {
    try {
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`Status ${response.status}: Falha ao acessar URL`);
      return await response.blob();
    } catch (error) {
      throw new Error('Bloqueio de CORS ou URL inválida.');
    }
  };

  const processQueue = async () => {
    setIsProcessing(true);
    setStopRequested(false);

    const queueIndices = items
      .map((item, index) =>
        item.status === 'idle' || item.status === 'error' ? index : -1
      )
      .filter((i) => i !== -1);

    let processedCount = 0;

    for (const index of queueIndices) {
      if (stopRequested) break;

      setItems((prev) => {
        const newItems = [...prev];
        newItems[index].status = 'processing';
        newItems[index].message = undefined;
        return newItems;
      });

      const item = items[index];

      try {
        // 1. Baixar
        const imageBlob = await downloadImage(item.external_image_url);
        const contentType = imageBlob.type;
        const fileExt = contentType.split('/')[1] || 'jpg';

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Sessão inválida');

        const fileName = `${user.id}/${item.id}-${Date.now()}.${fileExt}`;

        // 2. Upload Storage
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(`public/${fileName}`, imageBlob, {
            contentType: contentType,
            upsert: true,
          });

        if (uploadError) throw uploadError;

        // 3. Get Public URL
        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(`public/${fileName}`);

        // 4. Update DB
        const { error: dbError } = await supabase
          .from('products')
          .update({
            image_url: publicUrlData.publicUrl,
            external_image_url: null, // Limpa para não processar de novo
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        if (dbError) throw dbError;

        setItems((prev) => {
          const newItems = [...prev];
          newItems[index].status = 'success';
          return newItems;
        });
      } catch (error: any) {
        console.error('Erro no item ' + item.id, error);
        setItems((prev) => {
          const newItems = [...prev];
          newItems[index].status = 'error';
          newItems[index].message = error.message;
          return newItems;
        });
      }

      processedCount++;
      setProgress(Math.round((processedCount / queueIndices.length) * 100));
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    setIsProcessing(false);
    if (!stopRequested) {
      toast.success('Processamento finalizado!');
    } else {
      toast.info('Processamento interrompido.');
    }
  };

  const handleStop = () => {
    setStopRequested(true);
    toast.warning('Parando após o item atual...');
  };

  const stats = {
    total: items.length,
    success: items.filter((i) => i.status === 'success').length,
    error: items.filter((i) => i.status === 'error').length,
    pending: items.filter((i) => i.status === 'idle').length,
  };

  return (
    <div className="flex flex-col h-full">
      {/* HEADER DE CONTROLE */}
      <div className="bg-white dark:bg-slate-900 p-4 border-b border-gray-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex gap-6 text-sm w-full md:w-auto justify-center md:justify-start">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-300"></div>
            <span className="text-gray-600 dark:text-gray-400">
              Fila: <b>{stats.pending}</b>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
            <span className="text-gray-600 dark:text-gray-400">
              Sucesso: <b>{stats.success}</b>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            <span className="text-gray-600 dark:text-gray-400">
              Falhas: <b>{stats.error}</b>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {isProcessing ? (
            <button
              onClick={handleStop}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg font-bold transition-colors"
            >
              <Pause size={18} /> Parar
            </button>
          ) : (
            <button
              onClick={processQueue}
              disabled={stats.pending === 0 && stats.error === 0}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-bold transition-all shadow-md active:scale-95 ${
                stats.pending === 0 && stats.error === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-[var(--primary)] text-white hover:opacity-90'
              }`}
            >
              <Play size={18} /> Iniciar Sincronização
            </button>
          )}
        </div>
      </div>

      {/* PROGRESS BAR */}
      {isProcessing && (
        <div className="w-full h-1 bg-gray-100 dark:bg-slate-800">
          <div
            className="h-full bg-[var(--primary)] transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}

      {/* TABELA / CARDS */}
      <div className="flex-1 overflow-y-auto p-0">
        {/* Desktop: tabela tradicional */}
        <div className="hidden md:block w-full overflow-x-auto shadow-sm border border-gray-100 rounded-lg">
          <table className="w-full text-sm text-left min-w-full">
            <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 sticky top-0 shadow-sm z-10">
              <tr>
                <th className="px-3 sm:px-6 py-3 font-medium w-24">Status</th>
                <th className="px-3 sm:px-6 py-3 font-medium">Produto</th>
                <th className="px-3 sm:px-6 py-3 font-medium w-1/3">
                  Link de Origem
                </th>
                <th className="px-3 sm:px-6 py-3 font-medium w-1/3">Log</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group"
                >
                  <td className="px-3 sm:px-6 py-3">
                    {item.status === 'idle' && (
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full bg-gray-300 ml-2"
                        title="Aguardando"
                      />
                    )}
                    {item.status === 'processing' && (
                      <Loader2
                        size={20}
                        className="text-[var(--primary)] animate-spin"
                      />
                    )}
                    {item.status === 'success' && (
                      <CheckCircle size={20} className="text-green-500" />
                    )}
                    {item.status === 'error' && (
                      <XCircle size={20} className="text-red-500" />
                    )}
                  </td>
                  <td className="px-3 sm:px-6 py-3 font-medium text-gray-900 dark:text-white">
                    <div className="flex flex-col">
                      <span
                        className="truncate max-w-[250px]"
                        title={item.name}
                      >
                        {item.name}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        {item.reference_code || 'S/ Ref'}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3">
                    <a
                      href={item.external_image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-blue-500 hover:underline truncate max-w-[200px]"
                      title={item.external_image_url}
                    >
                      Abrir Link <ExternalLink size={12} />
                    </a>
                  </td>
                  <td className="px-3 sm:px-6 py-3 text-red-500 text-xs font-mono break-all">
                    {item.message ||
                      (item.status === 'success' ? (
                        <span className="text-green-600 font-medium">
                          Salvo com sucesso
                        </span>
                      ) : (
                        '-'
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: cards */}
        <div className="md:hidden p-4 grid grid-cols-1 gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0">
                    {item.status === 'idle' && (
                      <span className="inline-block w-3 h-3 rounded-full bg-gray-300" />
                    )}
                    {item.status === 'processing' && (
                      <Loader2
                        size={18}
                        className="text-[var(--primary)] animate-spin"
                      />
                    )}
                    {item.status === 'success' && (
                      <CheckCircle size={18} className="text-green-500" />
                    )}
                    {item.status === 'error' && (
                      <XCircle size={18} className="text-red-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {item.name}
                    </div>
                    <div className="text-xs text-gray-400 font-mono">
                      {item.reference_code || 'S/ Ref'}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className="relative group"
                    onTouchStart={() => showTooltip(`${item.id}-open`)}
                  >
                    <a
                      href={item.external_image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center p-2 rounded bg-white border text-blue-500"
                      aria-label="Abrir Link"
                    >
                      <ExternalLink size={14} />
                      <span className="sr-only">Abrir Link</span>
                    </a>
                    <span
                      className={`pointer-events-none absolute -top-9 left-1/2 transform -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 text-white text-xs px-2 py-1 transition-opacity ${
                        visibleTooltips[`${item.id}-open`]
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100 group-focus:opacity-100'
                      }`}
                    >
                      Abrir Link
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 text-xs font-mono text-red-500 break-words">
                {item.message ||
                  (item.status === 'success' ? (
                    <span className="text-green-600 font-medium">
                      Salvo com sucesso
                    </span>
                  ) : (
                    '-'
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER DE ERRO */}
      {stats.error > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 border-t border-orange-100 dark:border-orange-800 text-orange-800 dark:text-orange-200 text-xs flex items-start gap-2 animate-in slide-in-from-bottom-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">Erros de Download?</p>
            <p className="mt-1">
              Muitos sites bloqueiam downloads diretos por "CORS". Se a coluna
              "Status" mostrar erro vermelho, verifique se o link é público.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
