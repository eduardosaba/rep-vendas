'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { ImageDropzone } from '@/components/dashboard/ImageDropzone';
import { StagingProductCard } from '@/components/dashboard/StagingProductCard';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  Terminal,
  History,
  UploadCloud,
} from 'lucide-react';

// --- TIPAGEM ---
interface StagingImage {
  id: string;
  storage_path: string;
  original_name: string;
  publicUrl: string;
}

interface LogMessage {
  id: string;
  text: string;
  type: 'info' | 'error' | 'success';
  timestamp: string;
}

// --- SUB-COMPONENTE: Console de Logs ---
const LogConsole = ({ logs }: { logs: LogMessage[] }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (logs.length === 0) return null;

  return (
    <div className="bg-gray-900 text-green-400 p-4 rounded-xl text-xs font-mono shadow-inner border border-gray-800 max-h-48 overflow-y-auto animate-in slide-in-from-top-2">
      <div className="mb-2 text-gray-500 border-b border-gray-800 pb-2 font-bold flex items-center gap-2 sticky top-0 bg-gray-900 z-10">
        <Terminal size={14} /> LOG DE ATIVIDADE
      </div>
      <div className="space-y-1">
        {logs.map((log) => (
          <div
            key={log.id}
            className="truncate py-0.5 border-b border-gray-800/50 last:border-0 flex items-center gap-2"
          >
            <span className="opacity-40 select-none">[{log.timestamp}]</span>
            <span
              className={
                log.type === 'error'
                  ? 'text-red-400'
                  : log.type === 'success'
                    ? 'text-green-300'
                    : 'text-gray-300'
              }
            >
              {log.type === 'error'
                ? '❌'
                : log.type === 'success'
                  ? '✅'
                  : 'ℹ️'}{' '}
              {log.text}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};

// --- PÁGINA PRINCIPAL ---
export default function ImportVisualPage() {
  const supabase = createClient();
  const { usage, canCreate, refetch: refetchLimits } = usePlanLimits();

  // Estados
  const [stagingImages, setStagingImages] = useState<StagingImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // --- Helpers ---
  const addLog = useCallback(
    (message: string, type: 'info' | 'error' | 'success' = 'info') => {
      setLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substr(2, 9),
          text: message,
          type,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    },
    []
  );

  // 1. Inicializa Sessão de Histórico (Memoized)
  const ensureHistorySession = useCallback(async () => {
    if (currentSessionId) return currentSessionId;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('import_history')
        .insert({
          user_id: user.id,
          total_items: 0,
          brand_summary: 'Importação Visual (Fotos)',
          file_name: 'Upload Manual',
        })
        .select()
        .maybeSingle();

      if (error) throw error;

      setCurrentSessionId(data.id);
      addLog(
        `Sessão de histórico iniciada (ID: ${data.id.slice(0, 8)}).`,
        'success'
      );
      return data.id;
    } catch (e: any) {
      console.error(e);
      return null;
    }
  }, [currentSessionId, supabase, addLog]);

  // 2. Carregar imagens (Memoized)
  const fetchStagingImages = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('staging_images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const imagesWithUrls = data.map((img) => {
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(img.storage_path);
        return { ...img, publicUrl: urlData.publicUrl };
      });

      setStagingImages(imagesWithUrls);
    } catch (error: any) {
      console.error(error);
      addLog(`Erro ao buscar imagens: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [supabase, addLog]);

  // Carrega imagens ao montar
  useEffect(() => {
    fetchStagingImages();
  }, [fetchStagingImages]);

  // 3. Upload de novas imagens
  const handleUpload = async (files: File[]) => {
    // Verificação de limite
    if (usage.current + stagingImages.length + files.length > usage.max) {
      toast.warning('Limite do plano excedido', {
        description: `Você está tentando enviar mais fotos do que seu plano permite.`,
        duration: 5000,
      });
    }

    setUploading(true);
    addLog(`Iniciando upload de ${files.length} arquivos...`);
    let successCount = 0;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão inválida');

      await Promise.all(
        files.map(async (file) => {
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
          const filePath = `public/${user.id}/staging/${fileName}`; // Isolamento por usuário (prefixo public)

          // Upload Storage
          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, file);

          if (uploadError) {
            addLog(
              `Falha no upload de ${file.name}: ${uploadError.message}`,
              'error'
            );
            throw uploadError;
          }

          // Insert DB
          const { error: dbError } = await supabase
            .from('staging_images')
            .insert({
              user_id: user.id,
              storage_path: filePath,
              original_name: file.name,
            });

          if (!dbError) {
            successCount++;
            addLog(`Upload concluído: ${file.name}`, 'success');
          } else {
            addLog(`Erro ao salvar no banco: ${dbError.message}`, 'error');
          }
        })
      );

      if (successCount > 0) {
        toast.success(`${successCount} fotos enviadas com sucesso!`);
        fetchStagingImages();
      }
    } catch (error: any) {
      toast.error('Erro durante o upload');
    } finally {
      setUploading(false);
    }
  };

  // 4. Salvar Produto
  const handleSaveProduct = async (
    id: string,
    data: { name: string; price: string; reference: string }
  ) => {
    if (!canCreate) {
      toast.error('Limite Atingido', {
        description: `Seu plano não permite mais produtos (${usage.current}/${usage.max}).`,
        action: {
          label: 'Upgrade',
          onClick: () =>
            (window.location.href = '/dashboard/settings?tab=billing'),
        },
      });
      addLog(`Bloqueado: Limite do plano atingido.`, 'error');
      return;
    }

    try {
      const image = stagingImages.find((img) => img.id === id);
      if (!image) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      addLog(`Salvando produto: ${data.name}...`);
      const historyId = await ensureHistorySession();

      // Inserir Produto
      const slugify = (s: string) =>
        s
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-');

      const slugBase = slugify(data.name || 'produto');

      const { error: productError } = await supabase.from('products').insert({
        user_id: user.id,
        name: data.name,
        reference_code: data.reference,
        price: parseFloat(data.price.replace(/\./g, '').replace(',', '.')),
        sale_price: parseFloat(data.price.replace(/\./g, '').replace(',', '.')), // Define igual inicialmente
        image_url: image.publicUrl,
        images: [image.publicUrl],
        image_path: image.storage_path,
        last_import_id: historyId,
        slug: `${slugBase}-${Date.now().toString(36).slice(-6)}`,
      });

      if (productError) throw productError;

      // Atualizar Histórico
      if (historyId) {
        // Increment atomicamente usando RPC se possível, ou fetch+update
        // Simplificação: fetch atual + 1
        const { data: currentHist } = await supabase
          .from('import_history')
          .select('total_items')
          .eq('id', historyId)
          .maybeSingle();

        if (currentHist) {
          await supabase
            .from('import_history')
            .update({ total_items: currentHist.total_items + 1 })
            .eq('id', historyId);
        }
      }

      // Remover da Staging
      await supabase.from('staging_images').delete().eq('id', id);

      // Atualizar UI
      setStagingImages((prev) => prev.filter((img) => img.id !== id));
      refetchLimits(); // Atualiza contador do plano

      addLog(`Produto criado com sucesso: ${data.name}`, 'success');
      toast.success('Produto criado!');
    } catch (error: any) {
      console.error(error);
      addLog(`Erro ao salvar: ${error.message}`, 'error');
      toast.error('Erro ao salvar produto');
    }
  };

  // 5. Deletar Imagem
  const handleDeleteImage = async (id: string) => {
    try {
      const image = stagingImages.find((img) => img.id === id);
      if (!image) return;

      addLog(`Removendo imagem: ${image.original_name}...`);

      // Remover do Storage
      await supabase.storage
        .from('product-images')
        .remove([image.storage_path]);

      // Remover do Banco
      await supabase.from('staging_images').delete().eq('id', id);

      setStagingImages((prev) => prev.filter((img) => img.id !== id));
      toast.info('Imagem descartada.');
    } catch (error: any) {
      console.error(error);
      addLog(`Erro ao deletar: ${error.message}`, 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 pb-24 space-y-8 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/products"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Importação Visual
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Transforme fotos em produtos rapidamente arrastando arquivos.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/products/import-history"
          className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 px-4 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
        >
          <History size={16} />
          Ver Histórico
        </Link>
      </div>

      {/* ÁREA DE UPLOAD */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
              1
            </div>
            Envie suas fotos
          </h3>
          <span className="text-xs text-gray-400">Suporta JPG, PNG, WEBP</span>
        </div>

        {uploading ? (
          <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-blue-100 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 rounded-xl animate-pulse">
            <Loader2 size={32} className="animate-spin mb-3" />
            <p className="font-medium">Enviando para sua galeria segura...</p>
            <p className="text-xs opacity-70 mt-1">Por favor, aguarde.</p>
          </div>
        ) : (
          <ImageDropzone onDrop={handleUpload} />
        )}
      </div>

      {/* CONSOLE DE LOGS */}
      <LogConsole logs={logs} />

      {/* ÁREA DE PRODUTOS (Staging) */}
      {stagingImages.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                2
              </div>
              Preencha os dados{' '}
              <span className="text-gray-400 font-normal ml-1">
                ({stagingImages.length} pendentes)
              </span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {stagingImages.map((img) => (
              <StagingProductCard
                key={img.id}
                id={img.id}
                imageUrl={img.publicUrl}
                originalName={img.original_name}
                onSave={handleSaveProduct}
                onDelete={handleDeleteImage}
              />
            ))}
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && stagingImages.length === 0 && !uploading && (
        <div className="text-center py-12 opacity-50">
          <UploadCloud size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">
            Nenhuma imagem pendente para processar.
          </p>
        </div>
      )}
    </div>
  );
}
