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
  brand: string | null;
  category: string | null;
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
  const [stopOnError, setStopOnError] = useState(true); // Novo: parar no primeiro erro (padrão)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const supabase = createClient();

  // Extrai listas únicas de marcas e categorias
  const brands = Array.from(
    new Set(
      initialProducts.map((p) => p.brand).filter((b): b is string => Boolean(b))
    )
  ).sort();
  const categories = Array.from(
    new Set(
      initialProducts
        .map((p) => p.category)
        .filter((c): c is string => Boolean(c))
    )
  ).sort();

  // Filtra items baseado nos filtros ativos
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.reference_code?.toLowerCase() || '').includes(
        searchTerm.toLowerCase()
      ) ||
      (item.brand?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (item.category?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    const matchesBrand = !selectedBrand || item.brand === selectedBrand;
    const matchesCategory =
      !selectedCategory || item.category === selectedCategory;

    return matchesSearch && matchesBrand && matchesCategory;
  });

  const processQueue = async () => {
    setIsProcessing(true);
    setStopRequested(false);

    const queueIndices = items
      .map((item, index) =>
        item.status === 'idle' || item.status === 'error' ? index : -1
      )
      .filter((i) => i !== -1);

    let processedCount = 0;
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = stopOnError ? 1 : 999; // Para no primeiro erro OU nunca para

    console.log(
      `🚀 [SYNC] Iniciando processamento de ${queueIndices.length} imagens...`
    );
    console.log(
      `   Modo: ${stopOnError ? 'Parar no primeiro erro' : 'Continuar mesmo com erros'}`
    );

    for (const index of queueIndices) {
      if (stopRequested) {
        console.warn('⏸️ [SYNC] Processamento interrompido pelo usuário');
        toast.info('Processamento interrompido pelo usuário');
        break;
      }

      // Para automaticamente no primeiro erro (ANTES de processar o próximo)
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.error('❌ [SYNC] Processo interrompido devido a erro.');
        toast.error('❌ Processo interrompido no primeiro erro', {
          description: 'Corrija o problema e tente novamente.',
          duration: 10000,
        });
        break;
      }

      setItems((prev) => {
        const newItems = [...prev];
        newItems[index].status = 'processing';
        newItems[index].message = undefined;
        return newItems;
      });

      const item = items[index];
      console.log(
        `⏳ [SYNC] Processando: ${item.name || item.reference_code || item.id}`
      );
      console.log(`   URL: ${item.external_image_url}`);

      try {
        // Usa a API route do servidor para evitar bloqueios de CORS
        const response = await fetch('/api/process-external-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: item.id,
            externalUrl: item.external_image_url,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          // Mantém a mensagem original do servidor (já tratada lá)
          const errorMsg = result.error || 'Falha ao processar imagem';
          const errorDetails = result.details || '';
          const errorType = result.errorType || '';
          const originalError = result.originalError || '';

          // Log detalhado do erro com TODAS as informações
          console.error(
            `❌ [SYNC] ERRO ao processar produto "${item.name || item.id}"`
          );
          console.error(`   Mensagem: ${errorMsg}`);
          console.error(`   URL: ${item.external_image_url}`);
          if (errorType) console.error(`   Tipo: ${errorType}`);
          if (errorDetails) console.error(`   Detalhes: ${errorDetails}`);
          if (originalError) console.error(`   Código: ${originalError}`);
          console.error(`   Resposta completa:`, result);

          throw new Error(errorMsg);
        }

        // Sucesso - reseta contador de erros
        consecutiveErrors = 0;
        console.log(
          `✅ [SYNC] Sucesso: ${item.name || item.reference_code || item.id}`
        );
        setItems((prev) => {
          const newItems = [...prev];
          newItems[index].status = 'success';
          newItems[index].message = 'Internalizada ✓';
          return newItems;
        });
      } catch (error: any) {
        // Incrementa contador de erros consecutivos
        consecutiveErrors++;

        // Log imediato do erro
        console.error(
          '╔════════════════════════════════════════════════════════╗'
        );
        console.error(
          '║  ❌ ERRO NA INTERNALIZAÇÃO DE IMAGEM                 ║'
        );
        console.error(
          '╚════════════════════════════════════════════════════════╝'
        );
        console.error(
          `Produto: ${item.name || item.reference_code || item.id}`
        );
        console.error(`URL: ${item.external_image_url}`);
        console.error(`Erro: ${error.message || 'Erro desconhecido'}`);
        console.error('Stack:', error.stack);
        console.error(
          '════════════════════════════════════════════════════════'
        );

        // Toast imediato com detalhes
        toast.error(`❌ Erro ao processar: ${item.name || item.id}`, {
          description: error.message || 'Erro desconhecido',
          duration: 10000,
        });

        setItems((prev) => {
          const newItems = [...prev];
          newItems[index].status = 'error';
          newItems[index].message = error.message || 'Erro desconhecido';
          return newItems;
        });

        // Se configurado para parar no primeiro erro, interrompe AGORA
        if (stopOnError) {
          console.error('🛑 [SYNC] Parando processo devido a erro.');
          toast.error('🛑 Processo interrompido', {
            description: `Erro ao processar: ${item.name || item.id}`,
            duration: 10000,
          });
          setIsProcessing(false);
          return; // SAI IMEDIATAMENTE da função
        }
      }

      processedCount++;
      setProgress(Math.round((processedCount / queueIndices.length) * 100));
      await new Promise((resolve) => setTimeout(resolve, 500)); // Delay entre requisições
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
    total: filteredItems.length,
    totalGlobal: items.length,
    success: filteredItems.filter((i) => i.status === 'success').length,
    error: filteredItems.filter((i) => i.status === 'error').length,
    pending: filteredItems.filter((i) => i.status === 'idle').length,
  };

  return (
    <div className="flex flex-col h-full">
      {/* FILTROS E BUSCA */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 border-b border-blue-200 dark:border-blue-800">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Campo de Busca */}
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="🔍 Buscar por nome, referência, marca, categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Filtro de Marca */}
          <div>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            >
              <option value="">Todas as Marcas</option>
              {brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Categoria */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            >
              <option value="">Todas as Categorias</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Contador de Resultados */}
        {(searchTerm || selectedBrand || selectedCategory) && (
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Exibindo{' '}
            <strong className="text-blue-600 dark:text-blue-400">
              {filteredItems.length}
            </strong>{' '}
            de {stats.totalGlobal} produtos
            {searchTerm && (
              <span className="ml-2">• Busca: "{searchTerm}"</span>
            )}
            {selectedBrand && (
              <span className="ml-2">• Marca: {selectedBrand}</span>
            )}
            {selectedCategory && (
              <span className="ml-2">• Categoria: {selectedCategory}</span>
            )}
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedBrand('');
                setSelectedCategory('');
              }}
              className="ml-3 text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* HEADER DE CONTROLE */}
      <div className="bg-white dark:bg-slate-900 p-4 border-b border-gray-200 dark:border-slate-800 flex flex-col gap-4">
        {/* Linha 1: Estatísticas */}
        <div className="flex flex-wrap gap-6 text-sm justify-center md:justify-start">
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

        {/* Linha 2: Controles */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Checkbox: Parar no Primeiro Erro */}
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={stopOnError}
              onChange={(e) => setStopOnError(e.target.checked)}
              disabled={isProcessing}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50"
            />
            <span className="select-none">Parar no primeiro erro</span>
          </label>

          {/* Botão de Ação */}
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
                <th className="px-3 sm:px-6 py-3 font-medium">Marca</th>
                <th className="px-3 sm:px-6 py-3 font-medium">Categoria</th>
                <th className="px-3 sm:px-6 py-3 font-medium w-1/4">
                  Link de Origem
                </th>
                <th className="px-3 sm:px-6 py-3 font-medium w-1/4">Log</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredItems.map((item) => (
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
                  <td className="px-3 sm:px-6 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {item.brand || '-'}
                  </td>
                  <td className="px-3 sm:px-6 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {item.category || '-'}
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
          {filteredItems.map((item) => (
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
                    {(item.brand || item.category) && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {item.brand && <span>{item.brand}</span>}
                        {item.brand && item.category && (
                          <span className="mx-1">•</span>
                        )}
                        {item.category && <span>{item.category}</span>}
                      </div>
                    )}
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
