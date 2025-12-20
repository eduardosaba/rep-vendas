import React from 'react';
import Link from 'next/link';
import {
  BarChart3,
  ArrowLeft,
  TrendingUp,
  Package,
  Users,
  PieChart,
  Lock,
  Calendar,
} from 'lucide-react';

export const metadata = {
  title: 'Relatórios | Rep-Vendas',
  description: 'Visualize métricas e desempenho do seu negócio.',
};

export default function ReportsPage() {
  // Lista de futuros relatórios para mostrar o potencial do sistema
  const reportModules = [
    {
      title: 'Vendas Mensais',
      description: 'Acompanhe o faturamento e volume de vendas mês a mês.',
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-100 dark:bg-green-900/20',
    },
    {
      title: 'Giro de Estoque',
      description: 'Identifique produtos parados e os mais vendidos.',
      icon: Package,
      color: 'text-blue-600',
      bg: 'bg-blue-100 dark:bg-blue-900/20',
    },
    {
      title: 'Top Clientes',
      description: 'Saiba quem são seus melhores compradores.',
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-100 dark:bg-purple-900/20',
    },
    {
      title: 'Performance de Produtos',
      description: 'Análise detalhada de margem e lucro por item.',
      icon: PieChart,
      color: 'text-orange-600',
      bg: 'bg-orange-100 dark:bg-orange-900/20',
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-1rem)] bg-gray-50 dark:bg-slate-950 p-4 md:p-6 overflow-hidden">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl shadow-sm">
            <BarChart3 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Relatórios e Métricas
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Inteligência de dados para o seu negócio.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
        >
          <ArrowLeft size={16} />
          Voltar ao Início
        </Link>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 overflow-y-auto">
        {/* Banner de "Em Breve" */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-8 text-white shadow-lg mb-8 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold mb-4 border border-white/30">
              <Calendar size={12} />
              Em Desenvolvimento
            </div>
            <h2 className="text-3xl font-bold mb-4">Dashboards Inteligentes</h2>
            <p className="text-indigo-100 text-lg leading-relaxed">
              Estamos preparando uma suíte completa de relatórios para você
              visualizar o crescimento da sua empresa, controlar o fluxo de
              caixa e tomar decisões baseadas em dados reais.
            </p>
          </div>

          {/* Elementos decorativos de fundo */}
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
            <BarChart3 size={400} />
          </div>
        </div>

        {/* Grid de Previews */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {reportModules.map((item, index) => (
            <div
              key={index}
              className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors"
            >
              {/* Badge de Cadeado */}
              <div className="absolute top-4 right-4 text-gray-300 dark:text-slate-700">
                <Lock size={18} />
              </div>

              <div
                className={`w-12 h-12 ${item.bg} ${item.color} rounded-lg flex items-center justify-center mb-4`}
              >
                <item.icon size={24} />
              </div>

              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {item.description}
              </p>

              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded">
                  Disponível em breve
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
