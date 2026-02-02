import React, { useEffect, useState } from 'react';

type ShortLink = {
  id: string;
  code: string;
  destination_url: string;
  clicks_count?: number;
  created_at?: string;
};

export default function MyShortLinksTable({
  refreshSignal,
}: {
  refreshSignal?: number;
}) {
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editDestination, setEditDestination] = useState('');

  const fetchLinks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/short-links');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Falha ao buscar links');
      setLinks(json.data || []);
    } catch (err: any) {
      console.error('Erro fetching short links', err);
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
          Links Curtos
        </p>
        <button
          onClick={fetchLinks}
          className="text-xs text-slate-500 hover:underline"
        >
          Atualizar
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-slate-500 mt-2">Carregando...</p>
      ) : error ? (
        <p className="text-xs text-red-500 mt-2">{error}</p>
      ) : links.length === 0 ? (
        <p className="text-xs text-slate-500 mt-2">Nenhum link criado ainda.</p>
      ) : (
        <div className="mt-3 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="pb-2">Código</th>
                <th className="pb-2">Destino</th>
                <th className="pb-2">Cliques</th>
                <th className="pb-2">Criado</th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <tr
                  key={l.id}
                  className="align-top border-t border-slate-100 dark:border-slate-700"
                >
                  <td className="py-2 font-mono text-xs text-slate-700 dark:text-slate-200">
                    {l.code}
                  </td>
                  <td className="py-2 break-all text-xs text-slate-600 dark:text-slate-300">
                    {editingId === l.id ? (
                      <input
                        value={editDestination}
                        onChange={(e) => setEditDestination(e.target.value)}
                        className="w-full p-1 rounded border border-slate-200 dark:border-slate-700 text-xs"
                      />
                    ) : (
                      l.destination_url
                    )}
                  </td>
                  <td className="py-2 text-xs text-slate-600 dark:text-slate-300">
                    {l.clicks_count ?? 0}
                  </td>
                  <td className="py-2 text-xs text-slate-500">
                    {l.created_at
                      ? new Date(l.created_at).toLocaleString()
                      : '-'}
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => {
                          try {
                            const origin =
                              typeof window !== 'undefined'
                                ? window.location.origin
                                : '';
                            window.open(`${origin}/v/${l.code}`, '_blank');
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded"
                      >
                        Abrir
                      </button>

                      {editingId === l.id ? (
                        <>
                          <button
                            onClick={async () => {
                              // save
                              try {
                                const payload: any = { id: l.id };
                                if (editCode && editCode.trim() !== '')
                                  payload.code = editCode.trim();
                                if (editDestination)
                                  payload.destination_url = editDestination;
                                const res = await fetch('/api/short-links', {
                                  method: 'PATCH',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify(payload),
                                });
                                const json = await res.json();
                                if (!res.ok)
                                  throw new Error(
                                    json?.error || 'Falha ao atualizar'
                                  );
                                await fetchLinks();
                                setEditingId(null);
                              } catch (err: any) {
                                console.error('Erro atualizando link', err);
                                alert(err?.message || String(err));
                              }
                            }}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(l.id);
                            setEditCode(l.code || '');
                            setEditDestination(l.destination_url || '');
                          }}
                          className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded"
                        >
                          Editar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
