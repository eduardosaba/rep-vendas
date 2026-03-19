'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { 
  Users, Copy, History, Undo2, RefreshCw, Search, 
  Loader2, Database, Check, X, Zap 
} from 'lucide-react';

export default function CloneUserPage() {
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);
  
  // Estados de Dados
  const [users, setUsers] = useState<any[]>([]);
  const [sourceUser, setSourceUser] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [availableBrands, setAvailableBrands] = useState<{name: string, count: number}[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  
  // Estados de UI e Progresso
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isCloning, setIsCloning] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [cloneHistory, setCloneHistory] = useState<any[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<string[]>(['price', 'sale_price', 'is_active']);
  const [dryRunData, setDryRunData] = useState<{ count: number } | null>(null);
  const availableSyncProps = [
    { id: 'price', label: 'Preço Sugerido (Venda)' },
    { id: 'cost_price', label: 'Preço de Custo' },
    { id: 'is_active', label: 'Status (Ativo/Inativo)' },
    { id: 'is_launch', label: 'Lançamento' },
    { id: 'is_best_seller', label: 'Best Seller' },
    { id: 'stock_quantity', label: 'Estoque Real' },
    { id: 'description', label: 'Descrição' },
    { id: 'barcode', label: 'Código de Barras' },
  ];

  // 1. Carregar lista de usuários
  useEffect(() => {
    setMounted(true);

    async function loadUsers() {
      const { data } = await supabase.from('profiles').select('id, full_name, email').order('full_name');
      setUsers(data || []);
    }
    loadUsers();
  }, []);

  // 2. Busca de marcas da Origem (Garantia de contagem correta)
  useEffect(() => {
    async function loadSourceBrands() {
      if (!sourceUser) {
        setAvailableBrands([]);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('brand')
        .eq('user_id', sourceUser)
        .not('brand', 'is', null);

      if (!error) {
        const counts: Record<string, number> = {};
        data.forEach(p => { counts[p.brand] = (counts[p.brand] || 0) + 1; });
        const sorted = Object.entries(counts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setAvailableBrands(sorted);
      }
      setLoading(false);
      setSelectedBrands([]);
    }
    loadSourceBrands();
  }, [sourceUser]);

  // 3. Executar Clonagem com Barra de Progresso
  const handleClone = async () => {
    if (!sourceUser || !selectedUser || selectedBrands.length === 0) {
      return toast.error("Selecione origem, destino e ao menos uma marca");
    }

    setIsCloning(true);
    setProgress(5); // Início imediato

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      // Incremento simulado de progresso (experiência de usuário)
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) return prev;
          return prev + (prev < 50 ? 10 : 2); // Começa rápido, desacelera no final
        });
      }, 500);

      const res = await fetch('/api/admin/setup-new-user', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          sourceUserId: sourceUser,
          targetUserId: selectedUser,
          brands: selectedBrands
        })
      });

      const json = await res.json().catch(() => null);

      clearInterval(interval);

      if (!res.ok) {
        const detail = [json?.error, json?.detail, json?.hint]
          .filter(Boolean)
          .join(' | ');
        throw new Error(detail || 'Erro no processamento do clone');
      }

      setProgress(100);
      toast.success(json?.message || 'Catálogo clonado com sucesso!');
      
      // Resetar após a conclusão
      setTimeout(() => {
        setIsCloning(false);
        setProgress(0);
        setSelectedBrands([]);
      }, 1500);

    } catch (e: any) {
      setIsCloning(false);
      setProgress(0);
      toast.error(e.message);
    }
  };

  if (!mounted) {
    return (
      <div className="max-w-7xl mx-auto p-6 md:p-10 min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 text-slate-500">
          <Loader2 className="animate-spin" size={18} />
          Carregando central de clonagem...
        </div>
      </div>
    );
  }

  // 4. Histórico e Desfazer (Simplificados para Tailwind puro)
  const fetchHistory = async () => {
    if (!selectedUser) return toast.error("Selecione o destino");
    setShowHistory(true);
    setLoading(true);
    const { data } = await supabase.from('catalog_clones')
      .select('created_at, source_user:source_user_id(email), product:cloned_product_id(name, brand, reference_code)')
      .eq('target_user_id', selectedUser)
      .order('created_at', { ascending: false }).limit(50);
    setCloneHistory(data || []);
    setLoading(false);
  };

  const handleUndo = async () => {
    if (!selectedUser || selectedBrands.length === 0) return toast.error("Selecione destino e marcas");
    // abrir confirmação de desfazer no modal em vez do confirm do navegador
    setShowUndoConfirm(true);
  };

  const handleConfirmUndo = async () => {
    if (!selectedUser || selectedBrands.length === 0) return toast.error("Selecione destino e marcas");
    setLoading(true);
    try {
      // 1) buscar ids de produtos fonte com as marcas selecionadas
      const { data: srcProds, error: srcErr } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', sourceUser)
        .in('brand', selectedBrands);

      if (srcErr) throw srcErr;

      const srcIds = (srcProds || []).map((p: any) => p.id).filter(Boolean);
      if (srcIds.length === 0) {
        toast.info('Nenhum produto fonte encontrado para as marcas selecionadas. Nada a desfazer.');
        setShowUndoConfirm(false);
        return;
      }

      // 2) buscar mapeamentos em catalog_clones para o target e esses source ids
      const { data: mappings, error: mapErr } = await supabase
        .from('catalog_clones')
        .select('cloned_product_id')
        .eq('target_user_id', selectedUser)
        .in('source_product_id', srcIds);

      if (mapErr) throw mapErr;

      const clonedIds = (mappings || []).map((m: any) => m.cloned_product_id).filter(Boolean);
      if (clonedIds.length === 0) {
        toast.info('Nenhum produto clonados encontrado para desfazer.');
        setShowUndoConfirm(false);
        return;
      }

      // 3) deletar produtos clonados apenas (seguro) e remover mapeamentos correspondentes
      const { error: delErr } = await supabase.from('products').delete().in('id', clonedIds).eq('user_id', selectedUser);
      if (delErr) throw delErr;

      // opcional: remover entradas em catalog_clones para manter consistência
      const { error: delMapErr } = await supabase.from('catalog_clones').delete().in('cloned_product_id', clonedIds).eq('target_user_id', selectedUser);
      if (delMapErr) console.warn('falha ao remover mapeamentos de catalog_clones', delMapErr.message);

      toast.success('Remoção dos produtos clonados concluída');
      setSelectedBrands([]);
      setShowUndoConfirm(false);
    } catch (e: any) {
      console.error('Erro ao desfazer clonagem:', e);
      toast.error(e?.message || 'Erro ao desfazer clonagem');
    } finally {
      setLoading(false);
    }
  };

  // Sync properties with dry-run support
  const handleSyncProperties = async (isSimulation = true) => {
    if (!selectedUser || selectedBrands.length === 0) return toast.error('Selecione destino e marcas');

    // limpar estado anterior quando estamos simulando
    if (isSimulation) setDryRunData(null);

    // Se nenhum campo selecionado: solicitar "all" ao endpoint de sync (ele fará RPC quando aplicado)
    const payloadProperties = selectedProperties.length === 0 ? 'all' : selectedProperties;

    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const res = await fetch('/api/admin/sync-properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          targetUserId: selectedUser,
          sourceUserId: sourceUser || null,
          brands: selectedBrands.length > 0 ? selectedBrands : null,
          properties: payloadProperties,
          dryRun: Boolean(isSimulation),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.message || 'Erro na sincronização');

      if (isSimulation) {
        const count = typeof json.updatedProducts === 'number' ? json.updatedProducts : (json.updatedCount ?? json.updated_products ?? 0);
        setDryRunData({ count });
        toast.info(`Simulação: ${count} produtos detectados.`);
      } else {
        // execução real: RPC já foi chamada pelo servidor quando properties === 'all'
        toast.success('Sincronização aplicada', { description: json.message || `${json.updatedProducts || 0} produtos atualizados` });
        setDryRunData(null);
        setSelectedBrands([]);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Erro na sincronização');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-8 bg-slate-50 dark:bg-slate-950 min-h-screen">
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase flex items-center gap-3 text-slate-900 dark:text-white">
            <Database className="text-indigo-600" size={32} /> Central de Clonagem
          </h1>
          <p className="text-slate-500 font-medium italic">Gerencie e provisione catálogos entre representantes</p>
        </div>
      </header>

      {/* COMPONENTE DA BARRA DE PROGRESSO */}
      {isCloning && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-2 border-indigo-100 dark:border-indigo-900/30 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex justify-between items-end mb-4">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none">
                <RefreshCw className="text-white animate-spin" size={20} />
              </div>
              <div>
                <h4 className="font-black text-sm uppercase tracking-widest text-slate-800 dark:text-white leading-none">Clonagem Ativa</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Sincronizando {selectedBrands.length} marcas selecionadas...</p>
              </div>
            </div>
            <span className="text-xl font-black text-indigo-600 font-mono">{progress}%</span>
          </div>
          <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700">
            <div 
              className="h-full bg-indigo-600 transition-all duration-700 ease-out shadow-[0_0_20px_rgba(79,70,229,0.5)] relative overflow-hidden"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CONFIGURAÇÃO */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <h3 className="font-bold text-lg flex items-center gap-2 tracking-tight"><Users size={20} className="text-indigo-500"/> Definição de Usuários</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Origem (Template)</label>
                <select className="w-full p-4 rounded-2xl border bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 ring-indigo-500 transition-all" onChange={(e) => setSourceUser(e.target.value)} value={sourceUser || ''}>
                  <option value="">Selecione a Origem...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Destino (Alvo)</label>
                <select className="w-full p-4 rounded-2xl border bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 ring-indigo-500 transition-all" onChange={(e) => setSelectedUser(e.target.value)} value={selectedUser || ''}>
                  <option value="">Selecione o Destino...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
              <h3 className="font-bold text-lg flex items-center gap-2 tracking-tight"><Copy size={20} className="text-indigo-500"/> Seleção de Marcas</h3>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Filtrar marcas..." className="w-full pl-11 pr-4 py-3 rounded-2xl border bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 ring-indigo-500 text-sm" onChange={(e) => setBrandSearch(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto p-1">
              {availableBrands.filter(b => b.name.toLowerCase().includes(brandSearch.toLowerCase())).map(brand => (
                <button
                  key={brand.name}
                  onClick={() => setSelectedBrands(prev => prev.includes(brand.name) ? prev.filter(x => x !== brand.name) : [...prev, brand.name])}
                  className={`p-5 rounded-[1.5rem] border-2 transition-all text-left relative ${selectedBrands.includes(brand.name) ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-slate-300'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-black text-sm uppercase tracking-tight">{brand.name}</span>
                    {selectedBrands.includes(brand.name) && <Check size={16} className="text-indigo-600" />}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{brand.count} produtos</span>
                </button>
              ))}
              {availableBrands.length === 0 && !loading && <p className="col-span-full py-10 text-center text-slate-400 italic">Nenhuma marca disponível.</p>}
            </div>
          </div>
        </div>

        {/* PAINEL DE AÇÃO */}
        <div className="space-y-6">
          <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-xl text-white space-y-6">
            <div>
              <h3 className="font-black text-xl uppercase tracking-tighter flex items-center gap-2"><Zap size={22}/> Ações Rápidas</h3>
              <p className="text-indigo-100 text-xs mt-1 font-medium opacity-80">As alterações são permanentes no banco.</p>
            </div>

            <button 
              disabled={isCloning || loading || selectedBrands.length === 0}
              onClick={handleClone}
              className="w-full py-5 bg-white text-indigo-700 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg"
            >
              {isCloning ? "Clonando..." : "Executar Clone"}
            </button>
            
            <div className="grid grid-cols-2 gap-3">
              <button onClick={fetchHistory} className="py-3 bg-indigo-500/40 hover:bg-indigo-500/60 border border-white/20 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"><History size={14}/> Histórico</button>
              <button onClick={handleUndo} className="py-3 bg-rose-500/40 hover:bg-rose-500/60 border border-white/20 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"><Undo2 size={14}/> Desfazer</button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-black text-[10px] uppercase text-slate-400 tracking-[0.2em]">Campos de Sincronização</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedProperties(availableSyncProps.map(p => p.id))}
                  className="text-[11px] font-bold text-indigo-500 uppercase"
                  type="button"
                >
                  Selecionar todos
                </button>
                <button
                  onClick={() => setSelectedProperties([])}
                  className="text-[11px] font-bold text-slate-400 uppercase"
                  type="button"
                >
                  Desmarcar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {availableSyncProps.map(prop => (
                <label key={prop.id} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer border border-transparent hover:border-slate-100 transition-all group">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">{prop.label}</span>
                  <input
                    type="checkbox"
                    checked={selectedProperties.includes(prop.id)}
                    onChange={(e) => e.target.checked
                      ? setSelectedProperties([...selectedProperties, prop.id])
                      : setSelectedProperties(selectedProperties.filter(p => p !== prop.id))
                    }
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
              ))}
            </div>

            <div className="pt-4 space-y-3">
              {dryRunData ? (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl animate-pulse">
                  <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase text-center">⚠️ {dryRunData.count} produtos serão alterados</p>
                  <button
                    onClick={() => handleSyncProperties(false)}
                    className="w-full mt-2 py-3 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition-all"
                  >
                    Confirmar Alteração Real
                  </button>
                  <button onClick={() => setDryRunData(null)} className="w-full mt-1 text-[9px] text-slate-400 font-bold uppercase">Cancelar</button>
                </div>
              ) : (
                <button
                  onClick={() => handleSyncProperties(true)}
                  disabled={loading || selectedBrands.length === 0}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50"
                >
                  {loading ? (
                    'Processando...'
                  ) : selectedProperties.length === 0 ? (
                    'Simular Clone Completo'
                  ) : (
                    'Simular Sincronização'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL HISTÓRICO */}
      {showHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-950 w-full max-w-5xl rounded-[3rem] p-10 max-h-[85vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black uppercase tracking-tighter">Histórico de Atividade</h2>
              <button onClick={() => setShowHistory(false)} className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900/30 hover:text-rose-600 rounded-full transition-all"><X size={20}/></button>
            </div>
            <div className="overflow-y-auto flex-1 rounded-[2rem] border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                  <tr>
                    <th className="p-5 text-[10px] uppercase font-black text-slate-400 border-b">Produto</th>
                    <th className="p-5 text-[10px] uppercase font-black text-slate-400 border-b">Marca</th>
                    <th className="p-5 text-[10px] uppercase font-black text-slate-400 border-b">Template Origem</th>
                    <th className="p-5 text-[10px] uppercase font-black text-slate-400 border-b">Data</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {cloneHistory.map((h, i) => (
                    <tr key={i} className="border-b border-slate-50 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-5 font-bold text-slate-700 dark:text-slate-200">{h.product?.name || '---'}</td>
                      <td className="p-5"><span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-black uppercase text-slate-500">{h.product?.brand}</span></td>
                      <td className="p-5 text-slate-500 font-medium text-xs">{h.source_user?.email}</td>
                      <td className="p-5 text-slate-400 text-[10px] font-bold uppercase">{new Date(h.created_at).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE DESFAZER */}
      {showUndoConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-950 w-full max-w-2xl rounded-[2rem] p-8 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-xl font-black">Confirmar remoção</h3>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Deseja remover os produtos clonados para as marcas selecionadas do usuário destino? Esta ação remove apenas produtos que foram mapeados como clonados.</p>
            <div className="mt-6 flex gap-3 justify-end">
              <button onClick={() => setShowUndoConfirm(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-bold">Cancelar</button>
              <button onClick={handleConfirmUndo} className="px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-black">Confirmar remoção</button>
            </div>
          </div>
        </div>
      )}

      {/* CSS PARA ANIMAÇÃO DA BARRA */}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite linear;
        }
      `}</style>
    </div>
  );
}