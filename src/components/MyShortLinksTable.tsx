'use client';

import React, { useEffect, useState } from 'react';
import {
  Copy,
  ExternalLink,
  Trash2,
  BarChart2,
  Link as LinkIcon,
} from 'lucide-react';
import { toast } from 'sonner';

interface ShortLink {
  id: string;
  code: string;
  destination_url: string;
  clicks_count: number;
  created_at: string;
}

export default function MyShortLinksTable() {
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/short-links');
      const json = await res.json();
      if (!res.ok) {
        console.error('Failed loading short links', json);
        setLinks([]);
      } else {
        setLinks(json.data || []);
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const copyLink = (code: string) => {
    const fullUrl = `${window.location.origin}/v/${code}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success('Link copiado!');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este link?')) return;
    try {
      const res = await fetch('/api/short-links', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error || 'Falha ao remover');
        return;
      }
      if (json?.success) {
        toast.success('Link removido');
        load();
      } else {
        toast.error('Falha ao remover');
      }
    } catch (e) {
      toast.error('Erro');
    }
  };

  if (loading)
    return (
      <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mt-6">
        Carregando links...
      </div>
    );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <h3 className="text-lg font-bold">Meus Links e Campanhas</h3>
        <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full text-slate-500">
          {links.length} links
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 text-[11px] uppercase tracking-wider">
              <th className="px-6 py-4 font-bold">Código / Link</th>
              <th className="px-6 py-4 font-bold">Destino (Filtros)</th>
              <th className="px-6 py-4 font-bold text-center">Cliques</th>
              <th className="px-6 py-4 font-bold">Criado em</th>
              <th className="px-6 py-4 font-bold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {links.map((link) => (
              <tr
                key={link.id}
                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      /v/{link.code}
                    </span>
                    <button
                      onClick={() => copyLink(link.code)}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <LinkIcon size={14} className="flex-shrink-0" />
                    <span
                      className="truncate max-w-[200px]"
                      title={link.destination_url}
                    >
                      {link.destination_url.replace(window.location.origin, '')}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full ${link.clicks_count > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}
                  >
                    {link.clicks_count}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {new Date(link.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <a
                    href={`/v/${link.code}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                    title="Abrir link"
                  >
                    <ExternalLink size={18} />
                  </a>
                  <button
                    onClick={() => handleDelete(link.id)}
                    className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
