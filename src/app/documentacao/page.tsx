'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Search, 
  HelpCircle, 
  Package, 
  ShoppingBag, 
  Settings, 
  ChevronDown, 
  ChevronUp, 
  Zap, 
  AlertTriangle, 
  PlayCircle,
  FileText,
  Layers,
  ArrowRight
} from 'lucide-react';
import HeroDemoCTA from '@/components/HeroDemoCTA';
import { SYSTEM_LOGO_URL } from '@/lib/constants';
import { makeWhatsAppUrl } from '@/lib/format-whatsapp';

// --- DADOS DO MANUAL INTEGRADOS ---

const helpCategories = [
  {
    id: 'products',
    title: 'Gestão de Produtos Avançada',
    icon: Package,
    color: 'text-blue-600 bg-blue-50',
    articles: [
      {
        title: 'Como funciona o Sincronizador Inteligente (PROCV)?',
        content: (
          <div className="space-y-4">
            <p>
              O Sincronizador funciona como o comando{' '}
              <strong className="text-slate-900">PROCV (VLOOKUP)</strong> do Excel. Ele compara uma "chave"
              (SKU ou Referência) da sua planilha com os produtos que você já
              tem no sistema.
            </p>

            <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl space-y-3">
              <h4 className="text-xs font-black text-amber-800 uppercase flex items-center gap-2">
                <AlertTriangle size={16} /> Entendendo os Resultados
              </h4>
              <ul className="space-y-3 text-xs text-amber-900 leading-relaxed">
                <li className="flex gap-2">
                  <span className="shrink-0">✅</span>
                  <span>
                    <strong>Se houver correspondência (Match):</strong> O
                    sistema compara o valor. Se for diferente (ex: preço novo),
                    ele agenda a atualização automaticamente.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0">⚠️</span>
                  <span>
                    <strong>Se NÃO houver correspondência:</strong> Se o código
                    na planilha não existir no banco, o sistema 
                    <strong className="text-amber-950 ml-1">ignora a linha</strong>. 
                    Esta ferramenta apenas atualiza os existentes.
                  </span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Layers size={16} className="text-slate-400" /> Passo a passo:
              </h4>
              <ol className="space-y-2 text-sm text-slate-600">
                <li className="flex gap-3 items-start">
                  <span className="bg-slate-200 text-slate-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                  <span>Suba a planilha da fábrica ou sua tabela atualizada.</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="bg-slate-200 text-slate-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                  <span>Selecione a <strong>Coluna Chave</strong> (SKU/Ref).</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="bg-slate-200 text-slate-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                  <span><strong>IMPORTANTE:</strong> Use o botão <strong>Exportar Backup</strong> antes de confirmar para sua segurança.</span>
                </li>
              </ol>
            </div>

            <Link
              href="/dashboard/products/sync"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black hover:bg-indigo-100 transition-colors"
            >
              Acessar Sincronizador <Zap size={14} />
            </Link>
          </div>
        ),
      },
      {
        title: '🚀 Novo Motor de Imagens (Estratégia Resiliente)',
        content: (
          <div className="space-y-6">
            <p className="text-sm leading-relaxed">
              Desenvolvemos um sistema de <strong>Imagens em Camadas</strong>.
              Isso garante que seu catálogo nunca fique com imagens quebradas durante grandes importações.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                <span className="text-xl">1️⃣</span>
                <h5 className="text-[10px] font-black uppercase mt-2">Importação</h5>
                <p className="text-[10px] text-slate-500 mt-1">Links entram como "Pendentes" e já ficam visíveis.</p>
              </div>
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-center">
                <span className="text-xl">2️⃣</span>
                <h5 className="text-[10px] font-black uppercase mt-2 text-indigo-700">Sincronização</h5>
                <p className="text-[10px] text-indigo-600 mt-1">O robô baixa e converte para WebP (HD).</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                <span className="text-xl">3️⃣</span>
                <h5 className="text-[10px] font-black uppercase mt-2 text-emerald-700">Otimização</h5>
                <p className="text-[10px] text-emerald-600 mt-1">Catálogo troca para a versão rápida automaticamente.</p>
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-6 text-white space-y-4">
               <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400">Terminal de Comando Turbo</h4>
               <p className="text-xs text-slate-400">Para importações massivas, execute no seu terminal local:</p>
               <div className="bg-black/50 p-4 rounded-xl font-mono text-xs text-emerald-400 border border-white/5">
                 pnpm sincronizar
               </div>
               <p className="text-[10px] text-slate-500 italic">Isso processa imagens 10x mais rápido que o navegador.</p>
            </div>
          </div>
        ),
      },
      {
        title: 'Como usar a Edição em Massa?',
        content: (
          <div className="space-y-4">
            <p className="text-sm">Mude preços ou status de centenas de itens em segundos:</p>
            <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 ml-2">
              <li>Marque os produtos na <strong>Tabela Principal</strong>.</li>
              <li>Aparecerá uma <strong>Barra Flutuante</strong> inferior.</li>
              <li>Clique em <strong>Preço</strong> para reajustes percentuais ou fixos.</li>
              <li>Use <strong>Novo/Top</strong> para atualizar destaques em lote.</li>
            </ul>
          </div>
        ),
      },
    ],
  },
  {
    id: 'orders',
    title: 'Pedidos e Vendas',
    icon: ShoppingBag,
    color: 'text-green-600 bg-green-50',
    articles: [
      {
        title: 'Template de WhatsApp Customizado',
        content: (
          <div className="space-y-4">
            <p className="text-sm">Configure em <strong>Configurações &gt; Geral</strong>.</p>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-slate-50 p-4 rounded-xl border">
               <div className="text-slate-400">{'{{cliente}}'}</div> <div className="text-slate-700">Nome do comprador</div>
               <div className="text-slate-400">{'{{pedido_id}}'}</div> <div className="text-slate-700">ID único do pedido</div>
               <div className="text-slate-400">{'{{valor}}'}</div> <div className="text-slate-700">Total da compra</div>
            </div>
            <p className="text-xs bg-indigo-50 text-indigo-700 p-3 rounded-lg border border-indigo-100">
              Ex: "Olá <strong>{'{{cliente}}'}</strong>, recebemos seu pedido <strong>#<strong>{'{{pedido_id}}'}</strong></strong>!"
            </p>
          </div>
        ),
      },
    ],
  },
  {
    id: 'screenshots',
    title: 'Visual do Sistema',
    icon: FileText,
    color: 'text-orange-600 bg-orange-50',
    articles: [
      {
        title: 'Galeria de Exemplos',
        content: (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <img src="/images/help/sincronizador-procv.png" className="w-full h-32 object-contain bg-slate-50 rounded-xl border border-slate-100" />
                <p className="text-[10px] text-center font-bold text-slate-400 uppercase">Preview Importador</p>
              </div>
              <div className="space-y-2">
                <img src="/images/help/matcher.png" className="w-full h-32 object-contain bg-slate-50 rounded-xl border border-slate-100" />
                <p className="text-[10px] text-center font-bold text-slate-400 uppercase">Matcher de Fotos</p>
              </div>
              <div className="space-y-2">
                <img src="/images/help/dashboard.png" className="w-full h-32 object-contain bg-slate-50 rounded-xl border border-slate-100" />
                <p className="text-[10px] text-center font-bold text-slate-400 uppercase">Otimização</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 italic">Obs: Substitua as imagens em <strong>/public/images/help/</strong> por capturas da sua tela.</p>
          </div>
        )
      }
    ]
  }
];

export default function HelpPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [openCategory, setOpenCategory] = useState<string | null>('products');
  const [openArticle, setOpenArticle] = useState<string | null>(null);

  const filteredCategories = helpCategories
    .map((cat) => ({
      ...cat,
      articles: cat.articles.filter(
        (article) =>
          article.title.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }))
    .filter((cat) => cat.articles.length > 0);

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0d1b2c] font-sans">
      {/* Header (shared with site) */}
      <nav className="fixed top-0 w-full bg-[#0d1b2c]/95 backdrop-blur-md z-50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <img src={SYSTEM_LOGO_URL} alt="Rep-Vendas" className="h-10 sm:h-12 w-auto object-contain" />
            </Link>
          </div>

          <div className="hidden lg:flex items-center gap-8">
            <Link href="/" className="text-gray-300 hover:text-white transition-colors font-medium text-sm uppercase tracking-wide">Benefícios</Link>

            <HeroDemoCTA
              href="https://www.repvendas.com.br/catalogo/teste"
              label="Catálogo Demo"
              className="text-gray-300 hover:text-white transition-colors font-medium text-sm uppercase tracking-wide flex items-center gap-1"
            />

            <Link href="/login" className="text-white font-bold hover:text-[#b9722e] transition-colors">Entrar</Link>
            <Link href="/register" className="bg-[#b9722e] text-white px-6 py-2.5 rounded-full font-bold hover:bg-[#a06025] transition-all shadow-lg shadow-orange-900/20">Testar Grátis</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-12 pt-32">
        
        {/* Header Section */}
        <header className="text-center space-y-6">
          <div className="inline-flex p-5 bg-indigo-600 text-white rounded-[2.5rem] shadow-xl shadow-indigo-200">
            <HelpCircle size={48} strokeWidth={1.5} />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Central de <span className="text-indigo-600">Suporte</span>
            </h1>
            <p className="text-slate-500 font-medium text-lg">Tudo o que você precisa para dominar a plataforma.</p>
          </div>

          {/* Search Box */}
          <div className="relative max-w-2xl mx-auto mt-12">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
            <input
              type="text"
              placeholder="O que você deseja aprender hoje?"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-[2rem] border-none py-6 pl-16 pr-8 shadow-2xl shadow-indigo-900/5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-800 bg-white"
            />
          </div>
        </header>

        {/* Categories Accordion */}
        <div className="grid gap-6">
          {filteredCategories.map((category) => (
            <div
              key={category.id}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden"
            >
              <button
                onClick={() => setOpenCategory(openCategory === category.id ? null : category.id)}
                className="w-full flex items-center justify-between p-8 text-left hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-6">
                  <div className={`p-4 rounded-3xl ${category.color} shadow-sm`}>
                    <category.icon size={32} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                      {category.title}
                    </h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                      {category.articles.length} Artigos disponíveis
                    </p>
                  </div>
                </div>
                {openCategory === category.id ? <ChevronUp size={28} /> : <ChevronDown size={28} />}
              </button>

              {openCategory === category.id && (
                <div className="border-t border-slate-50 bg-slate-50/20 animate-in slide-in-from-top-2 duration-300">
                  {category.articles.map((article, idx) => (
                    <div key={idx} className="border-b border-slate-50 last:border-0">
                      <button
                        onClick={() => setOpenArticle(openArticle === article.title ? null : article.title)}
                        className="w-full flex items-center justify-between p-6 pl-10 md:pl-24 text-left hover:bg-white transition-all group"
                      >
                        <span className={`font-bold transition-colors flex items-center gap-4 ${openArticle === article.title ? 'text-indigo-600' : 'text-slate-600'}`}>
                          <div className={`w-2 h-2 rounded-full ${openArticle === article.title ? 'bg-indigo-600' : 'bg-slate-200 group-hover:bg-slate-400'}`} />
                          {article.title}
                        </span>
                        {openArticle === article.title ? <ArrowRight size={18} className="text-indigo-600" /> : <ChevronDown size={18} className="text-slate-300" />}
                      </button>
                      {openArticle === article.title && (
                        <div className="pl-10 md:pl-32 pr-10 pb-12 pt-4 text-slate-600 text-sm leading-relaxed animate-in fade-in">
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

        {/* Floating WhatsApp Card */}
        <div className="bg-[#25D366] rounded-[3rem] p-10 text-white text-center shadow-2xl shadow-green-200 mt-20 group hover:scale-[1.02] transition-transform duration-500">
           <h3 className="text-3xl font-black mb-4 flex items-center justify-center gap-3">
             Dúvida urgente? <PlayCircle size={32} />
           </h3>
           <p className="text-green-50 mb-8 font-medium">Nossa equipe de suporte está online para te ajudar agora.</p>
           <a
             href={makeWhatsAppUrl('5575981272323')}
             target="_blank"
             className="bg-white text-[#25D366] px-12 py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:shadow-xl transition-all inline-block"
           >
             Falar com Consultor
           </a>
        </div>
      </main>

      {/* Site Footer */}
      <footer className="bg-[#0d1b2c] text-gray-400 py-12 border-t border-white/10 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Link href="/">
              <img src={SYSTEM_LOGO_URL} alt="Rep-Vendas" className="h-10 md:h-12 w-auto opacity-90 hover:opacity-100 transition-all object-contain" />
            </Link>
          </div>
          <div className="text-sm flex gap-6">
            <Link href="/termos" className="hover:text-white transition-colors">Termos de Uso</Link>
            <Link href="/privacidade" className="hover:text-white transition-colors">Privacidade</Link>
            <Link href="/suporte" className="hover:text-white transition-colors">Suporte</Link>
          </div>
          <p className="text-sm">© 2025 Rep-Vendas. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}