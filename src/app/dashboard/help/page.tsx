'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Package,
  Users,
  ShoppingBag,
  Settings,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';

// --- DADOS DO MANUAL ---
// Aqui você pode adicionar/editar os tutoriais facilmente
const helpCategories = [
  {
    id: 'products',
    title: 'Gestão de Produtos',
    icon: Package,
    color: 'text-blue-600 bg-blue-50',
    articles: [
      {
        title: 'Como cadastrar um produto individual?',
        content: (
          <div className="space-y-2">
            <p>Para adicionar um único produto novo:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2 text-gray-600">
              <li>
                Vá até o menu <strong>Produtos</strong>.
              </li>
              <li>
                Clique no botão <strong>+ Novo Produto</strong> no topo direito.
              </li>
              <li>Preencha o nome, preço e referência (obrigatórios).</li>
              <li>Faça o upload da foto do produto.</li>
              <li>
                Clique em <strong>Salvar</strong>.
              </li>
            </ol>
            <Link
              href="/dashboard/products/new"
              className="inline-flex items-center text-sm text-blue-600 hover:underline mt-2"
            >
              Ir para Cadastro <ExternalLink size={14} className="ml-1" />
            </Link>
          </div>
        ),
      },
      {
        title: 'Como usar a Importação Visual (Arrastar Fotos)?',
        content: (
          <div className="space-y-2">
            <p>Esta é a forma mais rápida de cadastrar vários produtos:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2 text-gray-600">
              <li>
                Vá em <strong>Produtos</strong> e clique em{' '}
                <strong>Importar Fotos</strong>.
              </li>
              <li>
                Arraste todas as fotos dos seus produtos para a área pontilhada.
              </li>
              <li>
                O sistema vai carregar as fotos e criar cartões para cada uma.
              </li>
              <li>
                Preencha a Referência e o Preço em cada cartão e clique em
                Salvar.
              </li>
            </ol>
            <div className="bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800 border border-yellow-200 mt-2">
              <strong>Dica:</strong> Você não precisa fazer tudo de uma vez. As
              fotos ficam salvas lá até você preencher os dados.
            </div>
          </div>
        ),
      },
      {
        title: 'Como excluir ou editar um produto?',
        content:
          'Na lista de produtos, use os ícones à direita de cada item. O ícone de lápis serve para editar e a lixeira para excluir. Cuidado: excluir um produto remove-o do catálogo imediatamente.',
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
        title: 'Como funcionam os status do pedido?',
        content: (
          <ul className="space-y-2 text-gray-600 ml-2">
            <li>
              <span className="font-semibold text-yellow-600">Pendente:</span> O
              cliente enviou o pedido, mas você ainda não viu.
            </li>
            <li>
              <span className="font-semibold text-blue-600">Orçamento:</span> O
              cliente pediu cotação (preços ocultos). Você deve colocar os
              preços e retornar.
            </li>
            <li>
              <span className="font-semibold text-green-600">Completo:</span>{' '}
              Pedido entregue e finalizado.
            </li>
            <li>
              <span className="font-semibold text-red-600">Cancelado:</span>{' '}
              Pedido recusado ou desistência.
            </li>
          </ul>
        ),
      },
      {
        title: 'Onde vejo os pedidos que chegaram?',
        content:
          'Todos os pedidos aparecem no menu "Pedidos". Os mais recentes ficam no topo. Clique no ícone de "Olho" para ver os detalhes, itens comprados e dados do cliente.',
      },
    ],
  },
  {
    id: 'clients',
    title: 'Clientes',
    icon: Users,
    color: 'text-purple-600 bg-purple-50',
    articles: [
      {
        title: 'Como cadastrar um cliente?',
        content:
          'Vá ao menu "Clientes" e clique em "Novo Cliente". Você pode salvar nome, telefone (WhatsApp) e email. Isso facilita na hora de lançar pedidos manuais.',
      },
    ],
  },
  {
    id: 'settings',
    title: 'Catálogo e Configurações',
    icon: Settings,
    color: 'text-orange-600 bg-orange-50',
    articles: [
      {
        title: 'Como colocar senha nos preços?',
        content: (
          <div className="space-y-2">
            <p>Para proteger seu catálogo de concorrentes:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2 text-gray-600">
              <li>
                Vá em <strong>Configurações</strong> no menu lateral.
              </li>
              <li>
                Procure a opção <strong>Senha do Catálogo</strong>.
              </li>
              <li>Defina uma senha e salve.</li>
            </ol>
            <p>
              Agora, seus clientes verão um botão "Ver Preços" e precisarão
              digitar essa senha para liberar os valores.
            </p>
          </div>
        ),
      },
      {
        title: 'Como mudar o logo e as cores?',
        content:
          'No menu "Configurações", você pode fazer upload do seu logotipo e escolher a cor principal do sistema. O catálogo público atualizará automaticamente para refletir sua marca.',
      },
    ],
  },
];

export default function HelpPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [openArticle, setOpenArticle] = useState<string | null>(null);

  // Lógica de busca
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

  const toggleCategory = (id: string) => {
    if (searchTerm) return; // Não fecha na busca
    setOpenCategory(openCategory === id ? null : id);
  };

  const toggleArticle = (title: string) => {
    setOpenArticle(openArticle === title ? null : title);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="text-center space-y-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Como podemos ajudar?
        </h1>
        <p className="text-gray-500">
          Encontre tutoriais e respostas para usar o Rep-Vendas.
        </p>

        {/* Barra de Busca */}
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Buscar por 'produto', 'senha', 'pedido'..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-full border border-gray-300 py-3 pl-12 pr-6 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Conteúdo */}
      <div className="grid gap-6">
        {filteredCategories.map((category) => (
          <div
            key={category.id}
            className={`bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-300 ${
              openCategory === category.id || searchTerm
                ? 'shadow-md ring-1 ring-indigo-100'
                : 'shadow-sm'
            }`}
          >
            {/* Cabeçalho da Categoria */}
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${category.color}`}>
                  <category.icon size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {category.title}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {category.articles.length} tópicos disponíveis
                  </p>
                </div>
              </div>
              {/* Seta só aparece se não estiver buscando (na busca mostra tudo aberto) */}
              {!searchTerm && (
                <div className="text-gray-400">
                  {openCategory === category.id ? (
                    <ChevronUp />
                  ) : (
                    <ChevronDown />
                  )}
                </div>
              )}
            </button>

            {/* Lista de Artigos (Acordeão) */}
            <div
              className={`border-t border-gray-100 bg-gray-50/50 ${openCategory === category.id || searchTerm ? 'block' : 'hidden'}`}
            >
              {category.articles.map((article, idx) => (
                <div
                  key={idx}
                  className="border-b border-gray-100 last:border-0"
                >
                  <button
                    onClick={() => toggleArticle(article.title)}
                    className="w-full flex items-center justify-between p-4 pl-20 text-left hover:bg-gray-100 transition-colors group"
                  >
                    <span className="font-medium text-gray-700 group-hover:text-indigo-700 flex items-center gap-2">
                      <HelpCircle
                        size={16}
                        className="text-gray-400 group-hover:text-indigo-500"
                      />
                      {article.title}
                    </span>
                    <span className="text-gray-400">
                      {openArticle === article.title ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </span>
                  </button>

                  {/* Conteúdo do Artigo */}
                  {openArticle === article.title && (
                    <div className="pl-20 pr-6 pb-6 pt-2 text-gray-600 text-sm leading-relaxed animate-in slide-in-from-top-1">
                      {article.content}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredCategories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              Nenhum resultado encontrado para "{searchTerm}"
            </p>
            <button
              onClick={() => setSearchTerm('')}
              className="text-indigo-600 hover:underline mt-2 font-medium"
            >
              Limpar busca
            </button>
          </div>
        )}
      </div>

      {/* Rodapé de Suporte */}
      <div className="bg-indigo-900 rounded-2xl p-8 text-white text-center mt-12">
        <h3 className="text-xl font-bold mb-2">Ainda precisa de ajuda?</h3>
        <p className="text-indigo-200 mb-6">
          Nossa equipe de suporte está pronta para tirar suas dúvidas.
        </p>
        <a
          href="https://wa.me/55SEUNUMERO"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 bg-white text-indigo-900 px-6 py-3 rounded-lg font-bold hover:bg-indigo-50 transition-colors"
        >
          <PlayCircle size={20} /> Falar no WhatsApp
        </a>
      </div>
    </div>
  );
}
