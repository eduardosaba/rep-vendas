'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, PlusCircle, Share2, Store, Building2, ExternalLink } from 'lucide-react';

interface DashboardChecklistProps {
  organizationLinked: boolean;
  catalogConfigured: boolean;
  productsCount: number;
  catalogSlug?: string;
}

export function DashboardChecklist({
  organizationLinked,
  catalogConfigured,
  productsCount,
  catalogSlug,
}: DashboardChecklistProps) {
  const steps = [
    {
      id: 1,
      label: 'Criar sua conta RepVendas',
      completed: true,
      hint: 'Conta criada com sucesso',
    },
    {
      id: 2,
      label: 'Configurar seu negócio',
      completed: organizationLinked,
      hint: organizationLinked ? 'Empresa/Organização vinculada' : 'Pendente de organização',
      href: '/dashboard/settings',
    },
    {
      id: 3,
      label: 'Configurar seu catálogo público',
      completed: catalogConfigured,
      hint: catalogSlug ? `Link: /catalogo/${catalogSlug}` : 'Definir slug e cor da marca',
      href: '/dashboard/settings',
    },
    {
      id: 4,
      label: 'Cadastrar seu primeiro produto',
      completed: productsCount > 0,
      hint: productsCount > 0 ? `${productsCount} produto(s) cadastrado(s)` : 'Nenhum produto cadastrado',
      href: '/dashboard/products/new',
    },
    {
      id: 5,
      label: 'Compartlhar seu catálogo digital',
      completed: productsCount > 0 && catalogConfigured,
      hint: catalogSlug ? 'Compartilhe o link com seus clientes' : 'Catálogo pendente',
      href: catalogSlug ? `/catalogo/${catalogSlug}` : undefined,
      isExternal: true,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm mb-8 space-y-6">
      {/* EMPTY STATE AVISO SE 0 PRODUTOS */}
      {productsCount === 0 && (
        <div className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shrink-0 shadow-md">
              <Store size={28} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Seu catálogo está pronto para começar
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Adicione seus primeiros produtos para começar a compartilhar seu catálogo digital com seus clientes.
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/products/new"
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-md flex items-center gap-2 shrink-0"
          >
            <PlusCircle size={16} /> Adicionar Produtos
          </Link>
        </div>
      )}

      {/* CHECKLIST DE PRIMEIROS PASSOS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              Checklist de Primeiros Passos
            </h4>
            <p className="text-xs text-slate-500">
              Conclua os passos essenciais para ativar 100% da sua presença comercial.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {completedCount} de {steps.length} concluídos ({progressPercent}%)
            </div>
            <div className="w-24 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {steps.map((s) => {
            const ContentNode = (
              <div
                className={`p-3.5 border rounded-2xl transition-all flex flex-col justify-between space-y-2 h-full ${
                  s.completed
                    ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-xs leading-snug">{s.label}</span>
                  {s.completed ? (
                    <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Circle size={16} className="text-slate-400 shrink-0 mt-0.5" />
                  )}
                </div>

                <div className="text-[10px] opacity-80 flex items-center justify-between">
                  <span>{s.hint}</span>
                  {s.href && !s.completed && <span className="font-bold text-indigo-600 dark:text-indigo-400">&rarr;</span>}
                  {s.isExternal && s.href && <ExternalLink size={10} className="ml-1" />}
                </div>
              </div>
            );

            if (s.href) {
              return (
                <Link key={s.id} href={s.href} target={s.isExternal ? '_blank' : undefined}>
                  {ContentNode}
                </Link>
              );
            }

            return <div key={s.id}>{ContentNode}</div>;
          })}
        </div>
      </div>
    </div>
  );
}

export default DashboardChecklist;
