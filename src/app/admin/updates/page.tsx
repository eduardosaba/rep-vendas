'use client';

import React from 'react';
import { Rocket, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

type UpdateType = 'feature' | 'improvement' | 'bugfix' | string;

interface UpdateItem {
  id: number;
  version: string;
  date: string;
  type: UpdateType;
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | string;
}

export default function AdminUpdatesPage() {
  const updates: UpdateItem[] = [
    {
      id: 1,
      version: '1.0.0',
      date: '2024-01-15',
      type: 'feature',
      title: 'Sistema de Temas Personalizados',
      description:
        'Implementa��o completa do sistema de cores personaliz�veis com suporte a temas pr�-definidos.',
      status: 'completed',
    },
    {
      id: 2,
      version: '1.0.1',
      date: '2024-01-20',
      type: 'improvement',
      title: 'Otimiza��o de Gera��o de PDF',
      description:
        'Melhorias na compress�o de imagens e redu��o do tamanho dos arquivos PDF gerados.',
      status: 'completed',
    },
    {
      id: 3,
      version: '1.1.0',
      date: '2024-02-01',
      type: 'feature',
      title: 'Barra de Progresso em PDF',
      description:
        'Adi��o de barra de progresso em tempo real durante a gera��o de cat�logos PDF.',
      status: 'completed',
    },
  ];

  const getTypeColor = (type: UpdateType) => {
    switch (type) {
      case 'feature':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'improvement':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'bugfix':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getStatusIcon = (
    status: UpdateItem['status']
  ): React.ReactElement | null => {
    switch (status) {
      case 'completed':
        return (
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
        );
      case 'in-progress':
        return (
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 md:p-8 animate-in fade-in duration-500 min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Rocket className="h-8 w-8 text-[var(--primary)]" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Novidades & Updates
          </h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400">
          Acompanhe as �ltimas atualiza��es e melhorias do sistema.
        </p>
      </div>

      <div className="space-y-6">
        {updates.map((update) => (
          <div
            key={update.id}
            className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(
                      update.type
                    )}`}
                  >
                    {update.type === 'feature'
                      ? 'Nova Funcionalidade'
                      : update.type === 'improvement'
                        ? 'Melhoria'
                        : 'Corre��o'}
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    v{update.version}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {update.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {update.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(update.status)}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Calendar className="h-4 w-4" />
              <span>{new Date(update.date).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300 mb-2">
          Pr�ximas Atualiza��es
        </h3>
        <ul className="list-disc list-inside text-blue-800 dark:text-blue-400 space-y-1">
          <li>Integra��o com APIs de terceiros</li>
          <li>Dashboard de analytics avan�ado</li>
          <li>Sistema de notifica��es em tempo real</li>
          <li>Exporta��o de relat�rios em m�ltiplos formatos</li>
        </ul>
      </div>
    </div>
  );
}
