'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Package,
  ShoppingBag,
  Settings,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  HelpCircle,
  Zap,
  AlertTriangle,
} from 'lucide-react';

// --- DADOS DO MANUAL ---

<div className="mt-4">
  <h4 className="text-sm font-bold text-gray-900 mb-2">
    Exemplos / Screenshots (substitua pelas suas capturas)
  </h4>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div className="text-center">
      <img
        src="/images/product-placeholder.svg"
        alt="Preview CSV"
        className="mx-auto w-36 h-24 object-contain rounded-md border"
      />
      <p className="text-xs text-slate-500 mt-2">Preview do importador</p>
    </div>
    <div className="text-center">
      <img
        src="/images/placeholder-no-image.svg"
        alt="Matcher UI"
        className="mx-auto w-36 h-24 object-contain rounded-md border"
      />
      <p className="text-xs text-slate-500 mt-2">
        Matcher de Fotos (arraste e solte)
      </p>
    </div>
    <div className="text-center">
      <img
        src="/images/default-logo.png"
        alt="Sync Page"
        className="mx-auto w-36 h-24 object-contain rounded-md border"
      />
      <p className="text-xs text-slate-500 mt-2">
        Página: Otimização & Sincronização
      </p>
    </div>
  </div>
  <p className="text-xs text-slate-400 mt-2">
    Obs: substitua essas imagens em{' '}
    <span className="font-mono">/public/images/help/</span> por capturas reais
    para melhorar o guia.
  </p>
</div>;
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
              <strong>PROCV (VLOOKUP)</strong> do Excel. Ele compara uma "chave"
              (SKU ou Referência) da sua planilha com os produtos que você já
              tem no sistema.
            </p>

            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl space-y-3">
              <h4 className="text-xs font-black text-amber-800 uppercase flex items-center gap-2">
                <AlertTriangle size={16} /> Entendendo os Resultados
              </h4>
              <ul className="space-y-2 text-xs text-amber-900 leading-relaxed">
                <li>
                  <strong>✅ Se houver correspondência (Match):</strong> O
                  sistema compara o valor. Se for diferente (ex: preço novo),
                  ele agenda a atualização. Se for igual, ele ignora para poupar
                  processamento.
                </li>
                <li>
                  <strong>⚠️ Se NÃO houver correspondência:</strong> Se o código
                  na planilha não existir no seu banco de dados, o sistema{' '}
                  <strong>ignora a linha</strong>. Esta ferramenta não cria
                  produtos novos, apenas atualiza os existentes.
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-bold text-gray-900">
                Passo a passo para Sincronizar:
              </h4>
              <ol className="list-decimal list-inside space-y-2 ml-2 text-gray-600">
                <li>
                  Suba a planilha enviada pela fábrica ou sua tabela atualizada.
                </li>
                <li>
                  Selecione a <strong>Coluna Chave</strong> (a que contém o
                  código SKU/Ref na planilha).
                </li>
                <li>
                  Escolha o <strong>Campo de Destino</strong> (o que você quer
                  mudar no sistema, ex: Preço).
                </li>
                <li>
                  Clique em <strong>Comparar Dados</strong> para ver o Preview.
                </li>
                <li>
                  <strong>IMPORTANTE:</strong> Use o botão{' '}
                  <strong>Exportar Backup</strong> antes de confirmar. Assim, se
                  você mapear a coluna errada, terá como voltar ao valor
                  anterior subindo o backup.
                </li>
                <li>
                  Clique em <strong>Confirmar Alterações</strong> para gravar no
                  banco de dados.
                </li>
              </ol>
            </div>

            <Link
              href="/dashboard/products/sync"
              className="inline-flex items-center text-sm text-indigo-600 font-black hover:underline mt-2"
            >
              Acessar Sincronizador <Zap size={14} className="ml-1" />
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
              Isso significa que seu catálogo nunca fica com imagens quebradas,
              mesmo durante grandes importações de marcas como Tommy ou Safilo.
            </p>

            {/* INFOGRÁFICO SIMULADO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                <span className="text-xl">1️⃣</span>
                <h5 className="text-xs font-black uppercase mt-2">
                  Importação
                </h5>
                <p className="text-[10px] text-slate-500">
                  Links externos entram como "Pendentes" e já aparecem no
                  catálogo.
                </p>
              </div>
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-center">
                <span className="text-xl">2️⃣</span>
                <h5 className="text-xs font-black uppercase mt-2 text-indigo-700">
                  Sincronização
                </h5>
                <p className="text-[10px] text-indigo-600">
                  O robô baixa, converte para WebP e salva no seu Storage.
                </p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                <span className="text-xl">3️⃣</span>
                <h5 className="text-xs font-black uppercase mt-2 text-emerald-700">
                  Otimização
                </h5>
                <p className="text-[10px] text-emerald-600">
                  O catálogo troca automaticamente para a versão HD e rápida.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Zap size={16} className="text-indigo-500" /> Como executar o
                Ciclo Turbo:
              </h4>

              <div className="ml-4 space-y-4 border-l-2 border-slate-100 pl-6">
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-4 border-indigo-500" />
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-1">
                    Passo 1: Importar Excel
                  </p>
                  <p className="text-sm">
                    Suba sua planilha. O sistema salvará as URLs originais. Seus
                    clientes já verão as fotos (otimizadas via Next.js), mas o
                    status será <strong>"Pendente"</strong>.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-4 border-indigo-500" />
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-1">
                    Passo 2: Rodar Comando Local
                  </p>
                  <p className="text-sm">
                    No terminal do seu VS Code, execute o comando de
                    sincronização. Ele é 10x mais rápido que o navegador:
                  </p>
                  <div className="mt-2 p-3 bg-slate-900 rounded-xl font-mono text-[10px] text-indigo-300 shadow-inner">
                    pnpm sincronizar
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-4 border-indigo-500" />
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-1">
                    Passo 3: Conferir Saúde
                  </p>
                  <p className="text-sm">
                    Acesse o <strong>Painel de Diagnóstico</strong>. Quando a
                    barra chegar a 100%, todas as fotos estão no seu servidor,
                    seguras contra links quebrados dos fornecedores.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
              <h5 className="text-[10px] font-black uppercase text-blue-700 mb-2">
                Por que isso é importante?
              </h5>
              <p className="text-xs text-blue-800 leading-relaxed">
                Links de fornecedores costumam "expirar" ou mudar. Ao
                sincronizar, você garante que as fotos da sua loja{' '}
                <strong>nunca sumam</strong>, além de economizar até 80% de
                dados móveis para seus clientes.
              </p>
            </div>
          </div>
        ),
      },
      {
        title:
          'Sincronizar produtos e imagens (Excel + Matcher + URLs externas)',
        content: (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              Guia rápido para importar produtos via Excel/CSV e garantir que as
              imagens sejam internalizadas corretamente pelo motor de imagens.
            </p>

            <ol className="list-decimal list-inside ml-4 space-y-2 text-sm text-gray-600">
              <li>
                <strong>Preparar a planilha:</strong> inclua colunas mínimas
                como
                <span className="font-mono"> sku, name, price</span> e a coluna
                de imagens chamada <span className="font-mono">images</span> com
                URLs externas separadas por ponto‑e‑vírgula (;).
              </li>
              <li>
                <strong>Upload:</strong> vá em{' '}
                <Link
                  href="/dashboard/products/import"
                  className="text-indigo-600 font-bold"
                >
                  Produtos → Importar
                </Link>{' '}
                e envie o arquivo. Valide o preview antes de confirmar.
              </li>
              <li>
                <strong>Usar o Matcher (quando aplicável):</strong> se você
                tiver imagens locais ou nomes que não batem com SKU, abra o
                <span className="font-bold"> Matcher de Fotos</span> e arraste
                as imagens para os produtos correspondentes.
              </li>
              <li>
                <strong>Importação via URLs externas:</strong> se suas imagens
                já estão em hosts externos (ex.: fornecedores), mantenha-as na
                coluna <span className="font-mono">images</span>. Após a
                importação, vá para a página
                <Link
                  href="/dashboard/products/sync"
                  className="text-indigo-600 font-bold"
                >
                  {' '}
                  Otimização & Sincronização
                </Link>
                .
              </li>
              <li>
                <strong>Executar Sincronização:</strong> na página de
                Sincronização clique em <strong>Sincronizar Imagens</strong>. O
                worker fará: download, conversão via <em>Sharp</em>, upload ao
                bucket <em>product-images</em> e atualização da coluna
                <span className="font-mono">image_path</span> do produto.
              </li>
              <li>
                <strong>Monitorar e Reprocessar:</strong> produtos com
                <span className="font-mono">sync_status = 'failed'</span>{' '}
                mostrarão a razão em{' '}
                <span className="font-mono">sync_error</span>. Use
                <strong>Reprocessar</strong> ou execute em lote pela página de
                administração.
              </li>
            </ol>

            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl text-sm text-emerald-900">
              <strong>Checklist rápido:</strong>
              <ul className="mt-2 ml-4 list-disc list-inside text-sm text-emerald-800">
                <li>Exportou backup antes da importação?</li>
                <li>Validou 3–5 linhas no preview do importador?</li>
                <li>
                  Executou a página de{' '}
                  <strong>Otimização & Sincronização</strong> após importar?
                </li>
                <li>
                  Verificou se os arquivos .webp aparecem no bucket{' '}
                  <span className="font-mono">product-images</span>?
                </li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-100 p-3 rounded-2xl text-sm text-amber-900">
              <strong>Atenção:</strong> se você receber erros TLS ao baixar
              imagens no ambiente local, use essa opção apenas para diagnóstico.
              Em produção, corrija o certificado do host de origem ou use um
              proxy confiável.
            </div>
          </div>
        ),
      },
      {
        title: 'O que é o Matcher de Fotos?',
        content: (
          <div className="space-y-2">
            <p>
              Diferente do Sincronizador (que cuida de dados), o{' '}
              <strong>Matcher</strong> cuida da parte visual:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
              <li>
                Use para vincular fotos aos produtos importados via Excel.
              </li>
              <li>
                Basta arrastar a imagem da direita para o produto na esquerda.
              </li>
              <li>
                Ideal para quando você tem as fotos com nomes diferentes do
                código de referência.
              </li>
            </ul>
          </div>
        ),
      },
      {
        title: 'Como usar a Edição em Massa?',
        content: (
          <div className="space-y-2">
            <p>
              Para aplicar mudanças rápidas em blocos de produtos selecionados
              na lista:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
              <li>Marque os produtos desejados na tabela principal.</li>
              <li>
                Na barra inferior, use <strong>Novo/Top</strong> para destaques.
              </li>
              <li>
                Use <strong>Preço</strong> para reajustes percentuais (ex: +10%
                em todos).
              </li>
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
          <div className="space-y-2">
            <p>
              Você pode definir a mensagem que o cliente envia ao finalizar o
              pedido em <strong>Configurações &gt; Geral</strong>.
            </p>
            <div className="p-3 bg-gray-100 rounded-xl font-mono text-[10px] text-gray-600">
              Tags disponíveis: <br />
              {'{{cliente}}'} - Nome do Comprador <br />
              {'{{pedido_id}}'} - ID do Pedido <br />
              {'{{valor}}'} - Total da Compra <br />
              {'{{representante}}'} - Seu Nome de Assinatura
            </div>
            <p className="text-xs italic mt-2">
              Exemplo: "Olá {'{{cliente}}'}, recebi seu pedido {'{{pedido_id}}'}
              . Att, {'{{representante}}'}."
            </p>
          </div>
        ),
      },
    ],
  },
  {
    id: 'settings',
    title: 'Configurações de Loja',
    icon: Settings,
    color: 'text-orange-600 bg-orange-50',
    articles: [
      {
        title: 'Ativar/Desativar Loja (Modo Manutenção)',
        content:
          'Se você precisar pausar as vendas, use a chave "Status da Loja" em Configurações. Quando Offline, seus clientes verão uma página de "Voltamos em breve" com seu link de WhatsApp, impedindo novos pedidos mas mantendo seu contato visível.',
      },
    ],
  },
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
          article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (typeof article.content === 'string' &&
            article.content.toLowerCase().includes(searchTerm.toLowerCase()))
      ),
    }))
    .filter((cat) => cat.articles.length > 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 p-4 md:p-0">
      {/* Header */}
      <div className="text-center space-y-4 py-12 animate-in fade-in zoom-in-95 duration-700">
        <div className="inline-flex p-4 bg-indigo-50 rounded-[2rem] text-indigo-600 mb-2 shadow-inner">
          <HelpCircle size={40} strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          Como podemos ajudar?
        </h1>
        <p className="text-slate-500 max-w-lg mx-auto font-medium leading-relaxed">
          Explore os guias para dominar as ferramentas de sincronização, matcher
          e gestão do RepVendas.
        </p>

        <div className="relative max-w-xl mx-auto mt-10">
          <Search
            className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
            size={20}
          />
          <input
            type="text"
            placeholder="O que você deseja fazer agora?"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-[1.5rem] border-0 py-5 pl-14 pr-6 shadow-2xl shadow-indigo-900/10 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-800"
          />
        </div>
      </div>

      {/* Grid de Categorias */}
      <div className="grid gap-6">
        {filteredCategories.map((category) => (
          <div
            key={category.id}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-all"
          >
            <button
              onClick={() =>
                setOpenCategory(
                  openCategory === category.id ? null : category.id
                )
              }
              className="w-full flex items-center justify-between p-8 text-left hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-center gap-6">
                <div className={`p-4 rounded-2xl ${category.color} shadow-sm`}>
                  <category.icon size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                    {category.title}
                  </h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                    {category.articles.length} Artigos
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`text-slate-300 transition-transform duration-500 ${openCategory === category.id ? 'rotate-180' : ''}`}
                size={28}
              />
            </button>

            {openCategory === category.id && (
              <div className="border-t border-slate-50 bg-slate-50/30 animate-in slide-in-from-top-4 duration-500">
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
                      className="w-full flex items-center justify-between p-6 pl-12 md:pl-24 text-left hover:bg-white transition-colors group"
                    >
                      <span className="font-bold text-slate-600 group-hover:text-primary transition-colors flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-slate-200 group-hover:bg-primary" />
                        {article.title}
                      </span>
                      {openArticle === article.title ? (
                        <ChevronUp size={18} className="text-primary" />
                      ) : (
                        <ChevronDown size={18} className="text-slate-300" />
                      )}
                    </button>
                    {openArticle === article.title && (
                      <div className="pl-12 md:pl-32 pr-12 pb-10 pt-2 text-slate-600 text-sm leading-relaxed animate-in fade-in duration-300">
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

      {/* Suporte WhatsApp */}
      <div className="bg-slate-900 rounded-[3rem] p-12 text-white text-center mt-20 relative overflow-hidden shadow-2xl">
        <div className="relative z-10">
          <h3 className="text-3xl font-black mb-4">
            Ainda com dúvidas técnicas?
          </h3>
          <p className="text-slate-400 mb-10 max-w-md mx-auto font-medium">
            Nossa equipe de especialistas está online para ajudar você a escalar
            suas vendas.
          </p>
          <a
            href="https://wa.me/55SEUNUMERO"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-4 bg-primary text-white px-10 py-5 rounded-2xl font-black hover:scale-105 transition-all shadow-xl shadow-primary/20"
          >
            <PlayCircle size={24} /> SUPORTE VIA WHATSAPP
          </a>
        </div>
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-indigo-500 rounded-full blur-3xl"></div>
        </div>
      </div>
    </div>
  );
}
