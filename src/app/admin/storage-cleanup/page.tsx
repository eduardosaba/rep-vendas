'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '@/hooks/useConfirm';
import { createClient } from '@/lib/supabase/client';
import {
  Trash2,
  Move,
  Loader2,
  CheckCircle2,
  HardDrive,
  AlertTriangle,
  Database,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';

interface Orphan {
  name: string;
  path: string;
  size_kb: string;
  public_url: string;
}

export default function StorageCleanupPage() {
  const [loading, setLoading] = useState(false);
  const [orphans, setOrphans] = useState<Orphan[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [selectAll, setSelectAll] = useState(false);
  const [totalFiles, setTotalFiles] = useState(0);
  const { confirm } = useConfirm();
  const supabase = createClient();

  const fetchOrphans = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/admin/storage-cleanup', {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      const json = await res.json();
      if (res.ok) {
        setOrphans(json.orphans || []);
        setTotalFiles(json.total_files || 0);
        setSelected({});
        setSelectAll(false);
      } else {
        toast.error(json.error || 'Erro ao listar arquivos');
      }
    } catch (e) {
      toast.error('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrphans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSelect = (path: string) => {
    setSelected((s) => ({ ...s, [path]: !s[path] }));
  };

  const handleSelectAll = () => {
    const next = !selectAll;
    setSelectAll(next);
    if (next) {
      const map: Record<string, boolean> = {};
      orphans.forEach((o) => (map[o.path] = true));
      setSelected(map);
    } else {
      setSelected({});
    }
  };

  const selectedPaths = Object.keys(selected).filter((k) => selected[k]);
  const totalKb = orphans.reduce((sum, o) => sum + Number(o.size_kb || 0), 0);
  const selectedKb = selectedPaths.reduce(
    (sum, path) =>
      sum + Number(orphans.find((o) => o.path === path)?.size_kb || 0),
    0
  );

  const handleMoveToTrash = async () => {
    if (selectedPaths.length === 0)
      return toast.info('Selecione ao menos um arquivo');

    const ok = await confirm({
      title: 'Mover arquivos para a lixeira?',
      description: `Serão movidos ${selectedPaths.length} arquivos (${(selectedKb / 1024).toFixed(2)} MB) para /trash/. Você pode restaurá-los manualmente se necessário.`,
      confirmText: 'Mover para /trash/',
      cancelText: 'Cancelar',
    });

    if (!ok) return;
    setLoading(true);
    const toastId = toast.loading('Movendo arquivos para lixeira...');
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/admin/storage-cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ paths: selectedPaths }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(
          `✅ Movidos: ${json.moved} | 🛡️ Protegidos: ${json.protected}`,
          { id: toastId }
        );
        fetchOrphans();
      } else {
        toast.error(json.error || 'Erro ao mover arquivos', { id: toastId });
      }
    } catch (e) {
      toast.error('Erro de conexão', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePermanent = async () => {
    if (selectedPaths.length === 0)
      return toast.info('Selecione ao menos um arquivo');

    const ok = await confirm({
      title: '⚠️ Excluir permanentemente?',
      description: `Essa ação é IRREVERSÍVEL! Serão excluídos ${selectedPaths.length} arquivos (${(selectedKb / 1024).toFixed(2)} MB).`,
      confirmText: 'Confirmar Exclusão',
      cancelText: 'Cancelar',
    });

    if (!ok) return;

    const secondOk = await confirm({
      title: '🔴 Confirmação Final',
      description:
        'Esta é a última chance. Deseja realmente excluir permanentemente?',
      confirmText: 'Sim, excluir agora',
      cancelText: 'Cancelar',
    });

    if (!secondOk) return;

    setLoading(true);
    const toastId = toast.loading('Excluindo arquivos permanentemente...');
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/admin/storage-cleanup', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ paths: selectedPaths }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(`🗑️ Removidos: ${json.deleted?.length || 0} arquivos`, {
          id: toastId,
        });
        fetchOrphans();
      } else {
        toast.error(json.error || 'Erro ao apagar arquivos', { id: toastId });
      }
    } catch (e) {
      toast.error('Erro de conexão', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const orphanPercentage =
    totalFiles > 0 ? ((orphans.length / totalFiles) * 100).toFixed(1) : '0';

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl">
              <HardDrive size={28} />
            </div>
            Auditoria de Storage
          </h1>
          <p className="text-slate-500 font-medium mt-2">
            Identifique e limpe arquivos órfãos para economizar espaço no
            bucket.
          </p>
        </div>
        <button
          onClick={fetchOrphans}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all shadow-sm"
        >
          <RefreshCw className={loading ? 'animate-spin' : ''} size={18} />
          Recarregar
        </button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-2">
            <Database className="text-slate-400" size={24} />
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">
              Total Arquivos
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {totalFiles}
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-6">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="text-amber-600" size={24} />
            <span className="text-xs font-black uppercase tracking-widest text-amber-600">
              Órfãos
            </span>
          </div>
          <div className="text-3xl font-black text-amber-600">
            {orphans.length}
          </div>
          <div className="text-xs text-amber-600 font-bold mt-1">
            {orphanPercentage}% do total
          </div>
        </div>

        <div className="bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-200 dark:border-rose-800 p-6">
          <div className="flex items-center justify-between mb-2">
            <HardDrive className="text-rose-600" size={24} />
            <span className="text-xs font-black uppercase tracking-widest text-rose-600">
              Espaço Órfão
            </span>
          </div>
          <div className="text-3xl font-black text-rose-600">
            {(totalKb / 1024).toFixed(1)} MB
          </div>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="text-emerald-600" size={24} />
            <span className="text-xs font-black uppercase tracking-widest text-emerald-600">
              Economia Potencial
            </span>
          </div>
          <div className="text-3xl font-black text-emerald-600">
            {selectedPaths.length > 0
              ? (selectedKb / 1024).toFixed(1)
              : (totalKb / 1024).toFixed(1)}{' '}
            MB
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* TOOLBAR */}
        <div className="p-6 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="w-5 h-5 rounded border-slate-300"
                />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Selecionar todos
                </span>
              </label>
              {selectedPaths.length > 0 && (
                <div className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-black">
                  {selectedPaths.length} selecionados
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleMoveToTrash}
                disabled={loading || selectedPaths.length === 0}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-200 dark:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Move size={16} /> Mover p/ Lixeira
              </button>
              <button
                onClick={handleDeletePermanent}
                disabled={loading || selectedPaths.length === 0}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-wider shadow-lg shadow-red-200 dark:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} /> Excluir
              </button>
            </div>
          </div>
        </div>

        {/* FILE LIST */}
        <div className="p-6 space-y-3 max-h-[600px] overflow-y-auto">
          {orphans.map((o) => (
            <div
              key={o.path}
              className={`flex items-center justify-between p-4 border-2 rounded-2xl transition-all hover:border-indigo-200 dark:hover:border-indigo-800 ${
                selected[o.path]
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={!!selected[o.path]}
                  onChange={() => toggleSelect(o.path)}
                  className="w-5 h-5 rounded border-slate-300"
                />
                <div className="w-20 h-16 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                  <img
                    src={o.public_url}
                    alt={o.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {o.name}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-1">
                    {o.path}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm font-black text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                  {Number(o.size_kb) > 1024
                    ? `${(Number(o.size_kb) / 1024).toFixed(2)} MB`
                    : `${o.size_kb} KB`}
                </div>
              </div>
            </div>
          ))}

          {orphans.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center p-20 text-center">
              <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2
                  size={48}
                  className="text-emerald-600 dark:text-emerald-400"
                />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                Storage 100% Otimizado!
              </h3>
              <p className="text-slate-500 max-w-sm font-medium">
                Nenhum arquivo órfão encontrado. Seu bucket está limpo e
                eficiente.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center p-20">
              <Loader2 className="animate-spin text-indigo-600" size={48} />
            </div>
          )}
        </div>
      </div>

      {/* INFO BOX */}
      {orphans.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-blue-600 flex-shrink-0" size={20} />
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <strong className="font-bold">Dica de Segurança:</strong> Use{' '}
              <strong>"Mover p/ Lixeira"</strong> primeiro. Os arquivos ficarão
              em{' '}
              <code className="px-1 bg-blue-100 dark:bg-blue-900 rounded">
                /trash/
              </code>{' '}
              e poderão ser restaurados manualmente se necessário. Use{' '}
              <strong>"Excluir"</strong> apenas quando tiver certeza absoluta.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
