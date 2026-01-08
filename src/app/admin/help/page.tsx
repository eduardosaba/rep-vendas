'use client';

import { useState } from 'react';
import {
  Search,
  Package,
  ShoppingBag,
  Settings,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Zap,
  ShieldCheck,
  Info,
  LayoutDashboard,
  Database,
} from 'lucide-react';

// --- ESTRUTURA DA DOCUMENTAÇÃO PARA O USUÁRIO MASTER ---
const adminDocs = [
  {
    id: 'overview',
    title: '1. Visão Geral',
    icon: Info,
    color: 'text-indigo-600 bg-indigo-50',
    articles: [
      {
        title: 'Descrição do Sistema e Objetivos',
        content: (
          <div className="space-y-4">
            <p>
              O <strong>RepVendas (Torre de Controle)</strong> é uma plataforma
              SaaS centralizada projetada para representantes comerciais e
              indústrias que buscam digitalizar sua força de vendas.
            </p>
            <p>
              O objetivo principal é reduzir o atrito entre a escolha do produto
              pelo cliente e a emissão do pedido, utilizando catálogos digitais
              sincronizados em tempo real com o estoque e a produção.
            </p>
          </div>
        ),
      },
    ],
  },
  {
    id: 'quickstart',
    title: '2. Guia de Início Rápido',
    icon: Zap,
    color: 'text-amber-600 bg-amber-50',
    articles: [
      {
        title: 'Login e Configurações Iniciais',
        content: (
          <div className="space-y-3">
            <p>Para colocar a Torre de Controle em operação:</p>
            <ol className="list-decimal list-inside space-y-2 ml-2 text-gray-600">
              <li>
                <strong>Acesso:</strong> Utilize suas credenciais de
                administrador no portal master.
              </li>
              <li>
                <strong>Perfil da Loja:</strong> Configure o nome da operação,
                logo e número de WhatsApp para recebimento de pedidos em{' '}
                <em>Configurações {'>'} Geral</em>.
              </li>
              <li>
                <strong>Domínio:</strong> Verifique se o subdomínio ou domínio
                personalizado está apontado corretamente na Vercel.
              </li>
            </ol>
          </div>
        ),
      },
    ],
  },
  {
    id: 'features',
    title: '3. Funcionalidades Principais',
    icon: LayoutDashboard,
    color: 'text-green-600 bg-green-50',
    articles: [
      {
        title: 'Módulo de Catálogos',
        content:
          'Permite a segmentação de produtos por coleções ou clientes específicos. Os catálogos geram links únicos que podem ser rastreados para entender o engajamento do cliente.',
      },
      {
        title: 'Gestão de Pedidos',
        content:
          'Fluxo completo desde o recebimento via WhatsApp/Sistema até o status de faturamento. Inclui histórico de compras por cliente e métricas de conversão.',
      },
      {
        title: 'Controle de Estoque e Produção',
        content:
          'Sincronização via planilha (PROCV) ou atualização manual. Para fábricas, permite o controle de ordens de produção baseadas na demanda dos pedidos gerados.',
      },
    ],
  },
  {
    id: 'techstack',
    title: '4. Central de Ajuda & Stack',
    icon: Database,
    color: 'text-blue-600 bg-blue-50',
    articles: [
      {
        title: 'Resumo das Ferramentas (Stack Técnica)',
        content: (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-slate-100 rounded-xl">
              <h4 className="font-bold flex items-center gap-2 mb-2">
                <Zap size={16} className="text-blue-500" /> Next.js
              </h4>
              <p className="text-xs text-gray-500">
                Framework principal. Garante que a interface seja rápida,
                otimizada (SEO) e com navegação instantânea.
              </p>
            </div>
            <div className="p-4 border border-slate-100 rounded-xl">
              <h4 className="font-bold flex items-center gap-2 mb-2">
                <ShieldCheck size={16} className="text-green-500" /> Supabase
              </h4>
              <p className="text-xs text-gray-500">
                Backend as a Service. Gerencia o Banco de Dados PostgreSQL,
                Autenticação e Storage de fotos.
              </p>
            </div>
            <div className="p-4 border border-slate-100 rounded-xl">
              <h4 className="font-bold flex items-center gap-2 mb-2">
                <Settings size={16} className="text-slate-500" /> Tailwind CSS
              </h4>
              <p className="text-xs text-gray-500">
                Estilização responsiva. Mantém o design consistente em
                celulares, tablets e desktop.
              </p>
            </div>
            <div className="p-4 border border-slate-100 rounded-xl">
              <h4 className="font-bold flex items-center gap-2 mb-2">
                <Package size={16} className="text-orange-500" /> Vercel
              </h4>
              <p className="text-xs text-gray-500">
                Hospedagem de alta performance com deploy contínuo e automação
                de domínios.
              </p>
            </div>
          </div>
        ),
      },
    ],
  },
];

export default function AdminHelpPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [openCategory, setOpenCategory] = useState<string | null>('overview');
  const [openArticle, setOpenArticle] = useState<string | null>(null);

  const filteredDocs = adminDocs
    .map((cat) => ({
      ...cat,
      articles: cat.articles.filter(
        (article) =>
          article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (typeof article.content === 'string' &&
            article.content.toLowerCase().includes(searchTerm.toLowerCase()))
      ),
    }))
    .filter((cat) => cat.articles.length > 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 p-4 md:p-6">
      {/* Header Estilo Torre de Controle */}
      <div className="text-center space-y-4 py-8">
        <div className="inline-flex p-3 bg-slate-900 text-white rounded-2xl mb-2 shadow-lg">
          <ShieldCheck size={32} />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
          Documentação Master
        </h1>
        <p className="text-slate-500 max-w-lg mx-auto font-medium">
          Guia técnico e operacional da Torre de Controle. Use este manual para
          consulta rápida e ajustes estruturais no SaaS.
        </p>

        <div className="relative max-w-xl mx-auto mt-8">
          <Search
            className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar por funcionalidade ou ferramenta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border-slate-200 py-4 pl-12 pr-6 shadow-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all text-slate-800"
          />
        </div>
      </div>

      {/* Grid de Documentação */}
      <div className="grid gap-4">
        {filteredDocs.map((category) => (
          <div
            key={category.id}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
          >
            <button
              onClick={() =>
                setOpenCategory(
                  openCategory === category.id ? null : category.id
                )
              }
              className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${category.color}`}>
                  <category.icon size={22} />
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  {category.title}
                </h2>
              </div>
              <ChevronDown
                className={`text-slate-300 transition-transform ${openCategory === category.id ? 'rotate-180' : ''}`}
                size={22}
              />
            </button>

            {openCategory === category.id && (
              <div className="border-t border-slate-50 bg-slate-50/30">
                {category.articles.map((article, idx) => (
                  <div
                    key={idx}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <button
                      onClick={() =>
                        setOpenArticle(
                          openArticle === article.title ? null : article.title
                        )
                      }
                      className="w-full flex items-center justify-between p-5 pl-16 text-left hover:bg-white transition-colors group"
                    >
                      <span className="font-semibold text-slate-700 group-hover:text-slate-900">
                        {article.title}
                      </span>
                      {openArticle === article.title ? (
                        <ChevronUp size={16} className="text-slate-900" />
                      ) : (
                        <ChevronDown size={16} className="text-slate-300" />
                      )}
                    </button>
                    {openArticle === article.title && (
                      <div className="pl-16 pr-8 pb-6 pt-0 text-slate-600 text-sm leading-relaxed">
                        {article.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Técnico */}
      <div className="mt-12 p-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center">
        <p className="text-xs text-slate-400 font-mono uppercase tracking-widest">
          SaaS Engine v2.0 | Status:{' '}
          <span className="text-green-500 font-bold">Operacional</span>
        </p>
      </div>
    </div>
  );
}
