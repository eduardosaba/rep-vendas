'use client';

import React, { useState } from 'react';

type Log = {
  id: string;
  user_id: string | null;
  action: string | null;
  meta: any;
  allowed: boolean | null;
  reason: string | null;
  attempted_font: string | null;
  final_font: string | null;
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

  return (
    <>
      {/* DESKTOP: Tabela Tradicional */}
      <div className="mt-6 hidden md:block bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="w-full overflow-x-auto scrollbar-thin">
          <table
            className="w-full text-left border-collapse"
            style={{ minWidth: '700px' }}
          >
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/50 border-b dark:border-slate-800">
                <th className="p-2 sm:p-3 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 min-w-[120px]">
                  Usuário
                </th>
                <th className="p-2 sm:p-3 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 min-w-[150px]">
                  Ação
                </th>
                <th className="p-2 sm:p-3 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 min-w-[180px]">
                  Detalhes
                </th>
                <th className="p-2 sm:p-3 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 min-w-[140px]">
                  Quando
                </th>
                <th className="p-2 sm:p-3 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 min-w-[100px]">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {logs.map((l) => (
                <React.Fragment key={l.id}>
                  <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 text-sm text-gray-900 dark:text-white">
                      {l.user_id || '—'}
                    </td>
                    <td className="p-3 text-sm font-semibold text-gray-900 dark:text-white">
                      {humanizeAction(l.action)}
                    </td>
                    <td className="p-3 text-sm text-slate-600 dark:text-slate-400">
                      {l.reason ||
                        (typeof l.meta === 'string'
                          ? l.meta.slice(0, 120)
                          : JSON.stringify(l.meta).slice(0, 120))}
                    </td>
                    <td className="p-3 text-sm text-slate-400 dark:text-slate-500">
                      {l.created_at
                        ? new Date(l.created_at).toLocaleString()
                        : '—'}
                    </td>
                    <td className="p-3 text-sm">
                      <div
                        className="relative inline-block"
                        onTouchStart={() => showTooltip(`${l.id}-toggle`)}
                      >
                        <button
                          className="p-2 rounded text-primary hover:bg-primary/10"
                          onClick={() =>
                            setOpenId(openId === l.id ? null : l.id)
                          }
                          aria-label={
                            openId === l.id ? 'Fechar Detalhes' : 'Ver Detalhes'
                          }
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            className="w-4 h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15 12H9m0 0l3-3m-3 3l3 3"
                            />
                          </svg>
                        </button>
                        <span
                          className={`pointer-events-none absolute -top-9 left-1/2 transform -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 text-white text-xs px-2 py-1 transition-opacity ${
                            visibleTooltips[`${l.id}-toggle`]
                              ? 'opacity-100'
                              : 'opacity-0 group-hover:opacity-100 group-focus:opacity-100'
                          }`}
                        >
                          {openId === l.id ? 'Fechar' : 'Ver Detalhes'}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {openId === l.id && (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-4 bg-slate-50 dark:bg-slate-950/50 text-sm text-slate-700 dark:text-slate-300"
                      >
                        <div className="space-y-2">
                          {l.allowed !== null && (
                            <div>
                              <strong>Permitido:</strong>{' '}
                              {l.allowed ? 'Sim' : 'Não'}
                            </div>
                          )}
                          {l.reason && (
                            <div>
                              <strong>Motivo:</strong> {l.reason}
                            </div>
                          )}
                          {l.attempted_font && (
                            <div>
                              <strong>Fonte Tentada:</strong> {l.attempted_font}
                            </div>
                          )}
                          {l.final_font && (
                            <div>
                              <strong>Fonte Final:</strong> {l.final_font}
                            </div>
                          )}
                          {l.meta && (
                            <div>
                              <strong>Metadados:</strong>
                              <pre className="whitespace-pre-wrap break-words text-[13px] mt-1 dark:text-slate-400">
                                {typeof l.meta === 'string'
                                  ? l.meta
                                  : JSON.stringify(l.meta, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE: Cards Verticais */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:hidden">
        {logs.map((l) => (
          <div
            key={l.id}
            className="p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-bold text-sm text-gray-900 dark:text-white">
                  {humanizeAction(l.action)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {l.user_id || 'Usuário desconhecido'}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="text-slate-600 dark:text-slate-400 line-clamp-2">
                {l.reason ||
                  (typeof l.meta === 'string'
                    ? l.meta.slice(0, 120)
                    : JSON.stringify(l.meta).slice(0, 120))}
              </div>

              <div className="text-xs text-slate-400 dark:text-slate-500">
                {l.created_at ? new Date(l.created_at).toLocaleString() : '—'}
              </div>
            </div>

            <button
              className="mt-3 w-full text-center py-2 text-primary font-medium hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
              onClick={() => setOpenId(openId === l.id ? null : l.id)}
            >
              {openId === l.id ? 'Fechar Detalhes' : 'Ver Detalhes'}
            </button>

            {openId === l.id && (
              <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-950/50 rounded-lg text-sm text-slate-700 dark:text-slate-300 space-y-2">
                {l.allowed !== null && (
                  <div>
                    <strong>Permitido:</strong> {l.allowed ? 'Sim' : 'Não'}
                  </div>
                )}
                {l.reason && (
                  <div>
                    <strong>Motivo:</strong> {l.reason}
                  </div>
                )}
                {l.attempted_font && (
                  <div>
                    <strong>Fonte Tentada:</strong> {l.attempted_font}
                  </div>
                )}
                {l.final_font && (
                  <div>
                    <strong>Fonte Final:</strong> {l.final_font}
                  </div>
                )}
                {l.meta && (
                  <div>
                    <strong>Metadados:</strong>
                    <pre className="whitespace-pre-wrap break-words text-[13px] mt-1 dark:text-slate-400">
                      {typeof l.meta === 'string'
                        ? l.meta
                        : JSON.stringify(l.meta, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
