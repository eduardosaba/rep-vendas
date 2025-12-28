'use client';

import React, { useState } from 'react';

type Log = {
  id: string;
  user_id: string | null;
  action: string | null;
  payload: any;
  created_at: string | null;
};

function humanizeAction(action?: string | null) {
  if (!action) return 'Ação desconhecida';
  const a = action.toLowerCase();
  if (a.includes('sync') && a.includes('procv'))
    return 'Sincronização PROCV (Tabela completa)';
  if (a.includes('update') && a.includes('price'))
    return 'Atualização de Preços (Ajuste Financeiro)';
  if (a.includes('import')) return 'Importação via Planilha';
  return action;
}

export default function AuditLogsTable({ logs }: { logs: Log[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="mt-6 bg-white border rounded-2xl overflow-hidden shadow-sm">
      <div className="w-full overflow-x-auto scrollbar-thin">
        <table
          className="w-full text-left border-collapse"
          style={{ minWidth: '700px' }}
        >
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="p-2 sm:p-3 text-xs sm:text-sm font-bold min-w-[120px]">
                Usuário
              </th>
              <th className="p-2 sm:p-3 text-xs sm:text-sm font-bold min-w-[150px]">
                Ação
              </th>
              <th className="p-2 sm:p-3 text-xs sm:text-sm font-bold min-w-[180px]">
                Detalhes
              </th>
              <th className="p-2 sm:p-3 text-xs sm:text-sm font-bold min-w-[140px]">
                Quando
              </th>
              <th className="p-2 sm:p-3 text-xs sm:text-sm font-bold min-w-[100px]">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.map((l) => (
              <React.Fragment key={l.id}>
                <tr>
                  <td className="p-3 text-sm">{l.user_id || '—'}</td>
                  <td className="p-3 text-sm font-semibold">
                    {humanizeAction(l.action)}
                  </td>
                  <td className="p-3 text-sm text-slate-600">
                    {typeof l.payload === 'string'
                      ? l.payload.slice(0, 120)
                      : JSON.stringify(l.payload).slice(0, 120)}
                  </td>
                  <td className="p-3 text-sm text-slate-400">
                    {l.created_at
                      ? new Date(l.created_at).toLocaleString()
                      : '—'}
                  </td>
                  <td className="p-3 text-sm">
                    <button
                      className="text-primary font-medium hover:underline"
                      onClick={() => setOpenId(openId === l.id ? null : l.id)}
                    >
                      {openId === l.id ? 'Fechar' : 'Ver Detalhes'}
                    </button>
                  </td>
                </tr>

                {openId === l.id && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-4 bg-slate-50 text-sm text-slate-700"
                    >
                      <pre className="whitespace-pre-wrap break-words text-[13px]">
                        {typeof l.payload === 'string'
                          ? l.payload
                          : JSON.stringify(l.payload, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
