'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, ExternalLink } from 'lucide-react';

export default function AuditPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionRunning, setActionRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/audit/list');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      setItems(json.data || []);
    } catch (e: any) {
      toast.error('Erro ao carregar itens: ' + (e.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleFillAll = async () => {
    if (items.length === 0) return;
    if (!confirm(`Aplicar capa automática em ${items.length} produtos?`))
      return;
    setActionRunning(true);

    const ids = items.map((i) => i.id);
    try {
      const res = await fetch('/api/admin/audit/fill-covers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: ids }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'failed');
      // Summarize results
      const ok = (json.results || []).filter((r: any) => r.updated).length;
      const failed = (json.results || []).filter((r: any) => !r.updated);
      toast.success(
        `Ação concluída: ${ok} atualizados, ${failed.length} falhas`
      );
      if (failed.length > 0) console.warn('Falhas:', failed.slice(0, 5));
      load();
    } catch (e: any) {
      toast.error('Falha: ' + (e.message || e));
    } finally {
      setActionRunning(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">Auditoria: Capas sem P00</h2>
          <span className="text-sm text-gray-500">
            Verifique e corrija capas faltantes
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="px-3 py-2 bg-white border rounded-md"
          >
            Atualizar
          </button>
          <button
            onClick={handleFillAll}
            disabled={actionRunning || items.length === 0}
            className="px-4 py-2 bg-amber-500 text-white rounded-md disabled:opacity-50"
          >
            {actionRunning
              ? 'Processando...'
              : `Ação em Massa (${items.length})`}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg">
        {loading ? (
          <div>Carregando...</div>
        ) : items.length === 0 ? (
          <div className="text-gray-500">Nenhum item encontrado.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase">
                <th className="py-2">Produto</th>
                <th className="py-2">Capa atual</th>
                <th className="py-2">Todas as fotos</th>
                <th className="py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t">
                  <td className="py-2">
                    <div className="font-medium">{it.name}</div>
                    <div className="text-xs text-gray-400">{it.brand}</div>
                  </td>
                  <td className="py-2">
                    <a
                      href={it.image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:underline flex items-center gap-2"
                    >
                      Ver capa <ExternalLink size={12} />
                    </a>
                  </td>
                  <td className="py-2 text-xs text-gray-600">
                    {(it.images || [])
                      .slice(0, 5)
                      .map((u: string, i: number) => (
                        <div key={i}>
                          <a
                            href={u}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline"
                          >
                            {u}
                          </a>
                        </div>
                      ))}
                  </td>
                  <td className="py-2">
                    <button
                      onClick={async () => {
                        if (
                          !confirm('Aplicar capa automática para este produto?')
                        )
                          return;
                        try {
                          const res = await fetch(
                            '/api/admin/audit/fill-covers',
                            {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ productIds: [it.id] }),
                            }
                          );
                          const json = await res.json();
                          if (!res.ok) throw new Error(json?.error || 'failed');
                          const ok = (json.results || []).filter(
                            (r: any) => r.updated
                          ).length;
                          const failed = (json.results || []).filter(
                            (r: any) => !r.updated
                          );
                          toast.success(
                            `Resultado: ${ok} atualizado(s), ${failed.length} falha(s)`
                          );
                          if (failed.length > 0)
                            console.warn('Falha detalhe:', failed);
                          load();
                        } catch (e: any) {
                          toast.error('Erro: ' + (e.message || e));
                        }
                      }}
                      className="px-3 py-1 bg-indigo-600 text-white rounded-md"
                    >
                      Aplicar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
