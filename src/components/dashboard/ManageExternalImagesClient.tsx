'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Play,
  Pause,
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  AlertTriangle,
  CloudLightning,
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

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingCountToConfirm, setPendingCountToConfirm] = useState(0);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const CONFIRM_THRESHOLD = 50;

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
      (item.brand?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    const matchesBrand = !selectedBrand || item.brand === selectedBrand;
    const matchesCategory =
      !selectedCategory || item.category === selectedCategory;

    return matchesSearch && matchesBrand && matchesCategory;
  });

  /**
   * ESTA É A FUNÇÃO QUE ESCALA O SISTEMA
   * Em vez de fazer o loop aqui, ela avisa o Inngest para trabalhar no servidor.
   */
  const startBackgroundSync = async () => {
    setIsProcessing(true);
    setProgress(10); // Progresso visual inicial

    try {
      const response = await fetch('/api/sync-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setProgress(100);
        toast.success('🚀 Sincronização iniciada com sucesso!', {
          description:
            'O motor RepVendas está processando as imagens em segundo plano. Você já pode navegar por outras páginas ou fechar o sistema.',
          duration: 8000,
        });
      } else {
        throw new Error(
          result.error || 'Erro ao disparar motor de sincronização'
        );
      }
    } catch (error: any) {
      toast.error('Falha ao iniciar motor', {
        description: error.message,
      });
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartRequest = () => {
    const pendingItems = filteredItems.filter((i) => i.status !== 'success');

    if (pendingItems.length === 0) {
      toast.info('Tudo atualizado! Nenhum item pendente nos filtros atuais.');
      return;
    }

    if (pendingItems.length > CONFIRM_THRESHOLD) {
      setPendingCountToConfirm(pendingItems.length);
      setShowConfirm(true);
    } else {
      startBackgroundSync();
    }
  };

  const stats = {
    total: filteredItems.length,
    totalGlobal: items.length,
    success: filteredItems.filter((i) => i.status === 'success').length,
    pending: filteredItems.filter((i) => i.status === 'idle').length,
  };

  return (
    <div className="flex flex-col h-full">
      {/* FILTROS E BUSCA */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-900 dark:to-slate-900 p-4 border-b border-gray-200 dark:border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="🔍 Buscar por nome, marca ou referência..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
          >
            <option value="">Todas as Marcas</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
          >
            <option value="">Todas as Categorias</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PAINEL DE CONTROLE */}
      <div className="bg-white dark:bg-slate-900 p-4 border-b border-gray-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex gap-4 items-center">
          <div className="text-sm">
            <span className="text-gray-500">Exibindo:</span>{' '}
            <b className="text-indigo-600">{stats.total}</b> de{' '}
            {stats.totalGlobal}
          </div>
          <div className="h-4 w-[1px] bg-gray-200"></div>
          <div className="flex items-center gap-1.5 text-sm text-amber-600 font-medium">
            <CloudLightning size={16} />
            Background Ativo
          </div>
        </div>

        <button
          onClick={handleStartRequest}
          disabled={isProcessing || stats.total === 0}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
        >
          {isProcessing ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <Play size={18} fill="currentColor" />
          )}
          {isProcessing ? 'Acionando Motor...' : 'Sincronizar Catálogo'}
        </button>
      </div>

      {/* PROGRESS BAR */}
      {isProcessing && (
        <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-800">
          <div
            className="h-full bg-indigo-600 transition-all duration-1000"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}

      {/* TABELA DE ITENS */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-gray-50 dark:bg-slate-800 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="px-6 py-3 w-10">Status</th>
              <th className="px-6 py-3">Produto / Referência</th>
              <th className="px-6 py-3">Marca</th>
              <th className="px-6 py-3">Link Original</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {filteredItems.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-gray-50 dark:hover:bg-slate-800/40"
              >
                <td className="px-6 py-4">
                  {item.status === 'success' ? (
                    <CheckCircle className="text-green-500" size={20} />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-200" />
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {item.name}
                  </div>
                  <div className="text-xs text-gray-400">
                    {item.reference_code || 'Sem ref.'}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-500">{item.brand}</td>
                <td className="px-6 py-4">
                  <a
                    href={item.external_image_url}
                    target="_blank"
                    className="text-indigo-500 hover:underline flex items-center gap-1"
                  >
                    Ver <ExternalLink size={12} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DE CONFIRMAÇÃO */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowConfirm(false)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-slate-800 text-center">
            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CloudLightning size={40} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Processar em Lote?
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              Você tem <b>{pendingCountToConfirm}</b> imagens para internalizar.
              O processo será feito em segundo plano nos nossos servidores.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  startBackgroundSync();
                }}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all"
              >
                Sim, iniciar agora
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="w-full py-4 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 rounded-2xl font-bold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
