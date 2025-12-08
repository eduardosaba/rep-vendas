'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Loader2, 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Terminal, 
  XCircle 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  reference_code: string;
  external_image_url: string;
  brand?: string | null;
}

interface ManageExternalImagesClientProps {
  initialProducts: Product[];
}

export default function ManageExternalImagesClient({ initialProducts }: ManageExternalImagesClientProps) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  
  // Estados de Processamento
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingItems, setProcessingItems] = useState<Record<string, boolean>>({});
  
  // Console
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const icon = type === 'error' ? '❌ ' : type === 'success' ? '✅ ' : 'ℹ️ ';
    setLogs(prev => [...prev, `${icon}${message}`]);
  };

  // Função central que chama a API
  const callSyncApi = async (product: Product) => {
    // Não precisamos mandar a marca aqui, a API busca no banco por segurança
    const response = await fetch('/api/process-external-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        externalUrl: product.external_image_url
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erro desconhecido');
    return data;
  };

  // 1. Sincronização Individual
  const handleSingleSync = async (product: Product) => {
    setProcessingItems(prev => ({ ...prev, [product.id]: true }));
    addLog(`Iniciando sincronização: ${product.name}...`);

    try {
      await callSyncApi(product);
      
      toast.success(`Imagem salva!`);
      addLog(`Sucesso: ${product.name} sincronizado.`, 'success');
      
      setProducts(prev => prev.filter(p => p.id !== product.id));

    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
      addLog(`Erro em ${product.name}: ${error.message}`, 'error');
    } finally {
      setProcessingItems(prev => ({ ...prev, [product.id]: false }));
      router.refresh(); 
    }
  };

  // 2. Sincronização em Massa
  const handleSyncAll = async () => {
    if (products.length === 0) return;

    setIsBulkProcessing(true);
    setLogs([]); 
    addLog(`Iniciando processamento em lote de ${products.length} imagens...`);
    
    let successCount = 0;
    let errorCount = 0;

    const currentList = [...products];

    for (let i = 0; i < currentList.length; i++) {
      const product = currentList[i];
      addLog(`Processando (${i + 1}/${currentList.length}): ${product.name}...`);
      
      try {
        await callSyncApi(product);
        successCount++;
        addLog(`OK: ${product.name}`, 'success');
        setProducts(prev => prev.filter(p => p.id !== product.id));
      } catch (error: any) {
        errorCount++;
        addLog(`FALHA em ${product.name}: ${error.message}`, 'error');
      }

      setProgress(Math.round(((i + 1) / currentList.length) * 100));
    }

    setIsBulkProcessing(false);
    
    addLog(`--- FINALIZADO ---`);
    addLog(`Sucesso: ${successCount} | Erros: ${errorCount}`, errorCount === 0 ? 'success' : 'info');

    if (errorCount === 0) {
      toast.success(`Sucesso total! ${successCount} imagens processadas.`);
    } else {
      toast.warning(`Finalizado com ${errorCount} erros.`);
    }
    
    router.refresh(); 
  };

  if (products.length === 0 && initialProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-center animate-in fade-in duration-500">
        <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Tudo atualizado!</h3>
        <p className="text-gray-500">Não há produtos pendentes de sincronização.</p>
        <button 
          onClick={() => router.push('/dashboard/products')}
          className="mt-4 text-primary hover:underline text-sm font-medium"
        >
          Voltar para Produtos
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {products.length} Produtos Pendentes
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Produtos com link externo aguardando download para o Storage.
            </p>
          </div>
          
          <button 
            onClick={handleSyncAll} 
            disabled={isBulkProcessing || products.length === 0}
            className={`
              flex items-center px-6 py-2.5 rounded-lg font-medium text-primary-foreground transition-all shadow-sm
              ${isBulkProcessing 
                ? 'bg-primary/70 cursor-not-allowed' 
                : 'bg-primary hover:opacity-90 active:scale-95'}
            `}
          >
            {isBulkProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4 fill-current" />
                Sincronizar Todos
              </>
            )}
          </button>
        </div>

        {isBulkProcessing && (
          <div className="space-y-2 mb-6 animate-in slide-in-from-top-2">
            <div className="flex justify-between text-xs text-gray-600 font-medium">
              <span>Progresso Geral</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {(logs.length > 0 || isBulkProcessing) && (
          <div className="bg-gray-900 text-green-400 p-4 rounded-md text-xs font-mono shadow-inner border border-gray-700 max-h-48 overflow-y-auto mt-4">
            <div className="mb-2 text-gray-500 border-b border-gray-700 pb-1 font-bold flex items-center gap-2">
              <Terminal size={14} /> LOG DE SISTEMA
            </div>
            {logs.map((log, index) => (
              <div key={index} className="truncate py-0.5 border-b border-gray-800/50 last:border-0 font-mono flex gap-2">
                <span className="opacity-50 min-w-[70px]">[{new Date().toLocaleTimeString()}]</span>
                <span>{log}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-semibold">
              <tr>
                <th className="p-4 border-b w-[30%]">Produto</th>
                <th className="p-4 border-b w-[20%]">Referência</th>
                <th className="p-4 border-b w-[30%]">URL de Origem</th>
                <th className="p-4 border-b w-[20%] text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.slice(0, 50).map((product) => {
                const isItemLoading = processingItems[product.id];
                
                return (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="p-4 font-medium text-gray-900">{product.name}</td>
                    <td className="p-4 text-gray-500">{product.reference_code || '-'}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 max-w-[250px]">
                        <span className="text-xs text-gray-500 truncate w-full bg-gray-100 px-2 py-1 rounded" title={product.external_image_url}>
                          {product.external_image_url}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleSingleSync(product)}
                        disabled={isBulkProcessing || isItemLoading}
                        className={`
                          inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                          ${isItemLoading 
                            ? 'bg-primary/10 text-primary cursor-wait' 
                            : 'bg-white border border-gray-300 text-gray-700 hover:border-primary hover:text-primary hover:bg-primary/5 shadow-sm'}
                        `}
                      >
                        {isItemLoading ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3 h-3 mr-1.5" />
                            Sincronizar
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {products.length > 50 && (
          <div className="p-3 text-center text-xs text-gray-500 bg-gray-50 border-t">
            Exibindo os primeiros 50 itens de {products.length}.
          </div>
        )}
      </div>
    </div>
  );
}