'use client';

import React, { useEffect, useState } from 'react';
import { supabase as sharedSupabase } from '@/lib/supabaseClient';
import { 
  Trash2, 
  ArrowLeft, 
  Calendar, 
  Package, 
  Loader2, 
  FileText, 
  Camera, 
  FileSpreadsheet, 
  AlertTriangle 
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner'; // Padrão de alertas
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ImportHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const supabase = sharedSupabase;

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('import_history')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao buscar histórico', {
        description: 'Tente recarregar a página.'
      });
    } else {
      setHistory(data || []);
    }
    setLoading(false);
  };

  const handleUndoImport = async (importId: string) => {
    // Confirmação nativa para segurança crítica
    if (!confirm('ATENÇÃO: Isso excluirá TODOS os produtos e imagens desta importação permanentemente. Deseja continuar?')) return;

    setDeletingId(importId);
    
    // Inicia o Toast de carregamento (feedback imediato)
    const toastId = toast.loading('Revertendo importação e limpando arquivos...');

    try {
      // 1. BUSCAR IMAGENS PARA LIMPAR DO STORAGE
      // Antes de apagar o registro, precisamos saber quais arquivos apagar
      const { data: productsToDelete } = await supabase
        .from('products')
        .select('image_path')
        .eq('last_import_id', importId);

      // Filtra apenas os que têm imagem salva
      const pathsToDelete = productsToDelete
        ?.map((p) => p.image_path)
        .filter((path): path is string => !!path) || [];

      if (pathsToDelete.length > 0) {
        // Tenta apagar dos dois buckets possíveis para garantir limpeza total
        await supabase.storage.from('products').remove(pathsToDelete);
        await supabase.storage.from('product-images').remove(pathsToDelete);
      }

      // 2. Excluir Produtos do Banco
      const { error: prodError, count } = await supabase
        .from('products')
        .delete({ count: 'exact' })
        .eq('last_import_id', importId);

      if (prodError) throw prodError;

      // 3. Excluir o registro do histórico
      const { error: histError } = await supabase
        .from('import_history')
        .delete()
        .eq('id', importId);

      if (histError) throw histError;

      // Sucesso!
      toast.success('Importação desfeita com sucesso!', {
        id: toastId, // Atualiza o toast de loading
        description: `${count} produtos e ${pathsToDelete.length} imagens foram removidos.`
      });
      
      fetchHistory(); // Atualiza a lista

    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao desfazer importação', {
        id: toastId,
        description: err.message
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/products/import-massa" className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Histórico de Importações</h1>
          <p className="text-sm text-gray-500">Gerencie e reverta importações recentes</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-primary h-8 w-8" />
        </div>
      ) : history.length === 0 ? (
        <div className="text-center p-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <Package className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <h3 className="text-gray-900 font-medium text-lg">Nenhum histórico encontrado</h3>
          <p className="text-gray-500 text-sm">Suas importações de Excel e Fotos aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => {
            // Lógica visual para diferenciar Excel de Foto
            const isVisual = item.brand_summary?.includes('Visual') || item.file_name?.includes('Upload Manual');
            
            return (
              <div key={item.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-primary/40 hover:shadow-md transition-all">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {/* Ícone Diferenciado */}
                    <div className={`p-2.5 rounded-lg ${isVisual ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                      {isVisual ? <Camera size={20} /> : <FileSpreadsheet size={20} />}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-lg">{item.brand_summary || 'Várias Marcas'}</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full font-medium border border-gray-200">
                          {item.total_items} itens
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 font-mono">
                        ID: {item.id.slice(0, 8)}...
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-gray-500 pl-[52px]">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-gray-400" />
                      {item.created_at ? format(new Date(item.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR }) : '-'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FileText size={14} className="text-gray-400" />
                      <span className="truncate max-w-[200px]" title={item.file_name}>
                          {item.file_name || 'Arquivo desconhecido'}
                      </span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleUndoImport(item.id)}
                  disabled={deletingId === item.id}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 border border-red-100 whitespace-nowrap active:scale-95"
                  title="Apagar todos os produtos e imagens desta importação"
                >
                  {deletingId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Desfazer Tudo
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}