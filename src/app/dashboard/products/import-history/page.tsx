'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Trash2,
  ArrowLeft,
  Calendar,
  Package,
  Loader2,
  FileText,
  Camera,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ImportHistoryItem {
  id: string;
  total_items: number;
  brand_summary: string;
  file_name: string;
  created_at: string;
}

export default function ImportHistoryPage() {
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);
  const [typedConfirm, setTypedConfirm] = useState<string>('');

  const supabase = createClient();

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('import_history')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      toast.error('Erro ao buscar histórico');
    } else {
      setHistory(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  //
  const handleUndoImport = async (importId: string) => {
    setDeletingId(importId);
    setShowDeleteModal(false);
    const toastId = toast.loading(
      'Revertendo importação e limpando arquivos...'
    );

    try {
      // 1. Identificar imagens para remover do Storage
      const { data: products } = await supabase
        .from('products')
        .select('image_path, images')
        .eq('last_import_id', importId);

      // Coleta todos os paths (image_path principal + array images)
      const pathsToDelete: string[] = [];
      products?.forEach((p) => {
        if (p.image_path) pathsToDelete.push(p.image_path);
        // Se houver paths no array de imagens extras que não são URLs públicas
        if (Array.isArray(p.images)) {
          // Lógica opcional: se você salvar paths no array images, adicione aqui
        }
      });

      // 2. Remover arquivos do Storage (se houver) via endpoint server-side seguro
      if (pathsToDelete.length > 0) {
        try {
          await fetch('/api/storage/safe-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paths: pathsToDelete }),
          });
        } catch (e) {
          console.error('Erro ao solicitar remoção de arquivos:', e);
        }

        // Tentativa de remover em bucket legado (não fatal)
        try {
          await fetch('/api/storage/safe-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paths: pathsToDelete, bucket: 'products' }),
          });
        } catch (e) {
          // ignore
        }
      }

      // 3. Excluir Produtos do Banco (Cascade deve cuidar do resto, mas garantimos aqui)
      const { error: prodError, count } = await supabase
        .from('products')
        .delete({ count: 'exact' })
        .eq('last_import_id', importId);

      if (prodError) throw prodError;

      // 4. Excluir o registro do histórico
      const { error: histError } = await supabase
        .from('import_history')
        .delete()
        .eq('id', importId);

      if (histError) throw histError;

      toast.success('Desfeito com sucesso!', {
        id: toastId,
        description: `${count || 0} produtos removidos.`,
      });

      fetchHistory(); // Recarrega a lista
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao reverter', {
        id: toastId,
        description: err.message,
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/products"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Histórico de Importações
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gerencie e reverta operações em massa realizadas recentemente.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400 h-8 w-8" />
            <p className="text-sm text-gray-400">Carregando histórico...</p>
          </div>
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-gray-300 dark:border-slate-700 text-center">
          <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <Package className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-gray-900 dark:text-white font-medium text-lg">
            Nenhum histórico encontrado
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 max-w-sm">
            Suas importações de planilhas Excel e uploads manuais de fotos
            aparecerão aqui.
          </p>
          <div className="flex gap-3 mt-6">
            <Link
              href="/dashboard/products/import-massa"
              className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 rounded-lg text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
            >
              Importar Excel
            </Link>
            <Link
              href="/dashboard/products/import-visual"
              className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 rounded-lg text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
            >
              Importar Fotos
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {history.map((item) => {
            // Identifica o tipo de importação baseado no nome ou resumo
            const isVisual =
              item.brand_summary?.includes('Visual') ||
              item.file_name?.includes('Upload Manual');

            return (
              <div
                key={item.id}
                className="group bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="flex items-start gap-4 w-full md:w-auto">
                  {/* Ícone Indicativo */}
                  <div
                    className={`p-3 rounded-xl shrink-0 ${
                      isVisual
                        ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-300'
                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300'
                    }`}
                  >
                    {isVisual ? (
                      <Camera size={24} />
                    ) : (
                      <FileSpreadsheet size={24} />
                    )}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg truncate">
                        {item.brand_summary || 'Importação Geral'}
                      </h3>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                          isVisual
                            ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800'
                            : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800'
                        }`}
                      >
                        {item.total_items}{' '}
                        {item.total_items === 1 ? 'item' : 'itens'}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span
                        className="flex items-center gap-1.5"
                        title="Nome do Arquivo"
                      >
                        <FileText size={14} />
                        <span className="truncate max-w-[200px]">
                          {item.file_name}
                        </span>
                      </span>
                      <span className="hidden sm:inline text-gray-300 dark:text-slate-700">
                        |
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        {item.created_at
                          ? format(
                              new Date(item.created_at),
                              "dd 'de' MMM 'às' HH:mm",
                              { locale: ptBR }
                            )
                          : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botão de Ação */}
                <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0 pl-[60px] md:pl-0">
                  <button
                    onClick={() => {
                      setSelectedImportId(item.id);
                      setShowDeleteModal(true);
                    }}
                    disabled={deletingId === item.id}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-100 dark:border-red-900/30 rounded-lg transition-all disabled:opacity-50 active:scale-95 group-hover:bg-red-100 dark:group-hover:bg-red-900/40"
                    title="Reverter Importação"
                  >
                    {deletingId === item.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                    <span className="whitespace-nowrap">Desfazer</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full p-6 text-center animate-in zoom-in-95 border border-red-100 dark:border-red-900/30">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Reverter Importação?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
              <strong className="text-red-600 dark:text-red-400">
                ATENÇÃO:
              </strong>{' '}
              Esta ação é irreversível.
              <br />
              <br />
              Isso apagará <strong>TODOS os produtos</strong> criados nesta
              importação e suas respectivas fotos do storage.
            </p>
            <div className="mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Para confirmar, digite <strong>DELETE</strong>:
              </p>
              <input
                value={typedConfirm}
                onChange={(e) => setTypedConfirm(e.target.value)}
                placeholder="Digite DELETE para confirmar"
                className="w-full p-2 border rounded bg-white dark:bg-slate-800 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedImportId(null);
                  setTypedConfirm('');
                }}
                className="py-3 rounded-lg border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() =>
                  selectedImportId &&
                  typedConfirm.trim().toUpperCase() === 'DELETE' &&
                  handleUndoImport(selectedImportId)
                }
                disabled={typedConfirm.trim().toUpperCase() !== 'DELETE'}
                className="py-3 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"
              >
                Sim, Reverter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
