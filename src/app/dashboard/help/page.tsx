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
  Zap,
  Link as LinkIcon,
  FileText,
  Palette,
  Archive
} from 'lucide-react';

// --- DADOS DO MANUAL ---
const helpCategories = [
  {
    id: 'products',
    title: 'Gestão de Produtos Avançada',
    icon: Package,
    color: 'text-blue-600 bg-blue-50',
    articles: [
      {
        title: 'Como usar a Edição em Massa?',
        content: (
          <div className="space-y-2">
            <p>Para editar vários produtos ao mesmo tempo (ex: aumentar preços ou marcar como lançamento):</p>
            <ol className="list-decimal list-inside space-y-1 ml-2 text-gray-600">
              <li>Na lista de produtos, clique nas <strong>caixas de seleção</strong> à esquerda dos produtos.</li>
              <li>Para selecionar <strong>todos</strong>, clique na caixa do cabeçalho da tabela.</li>
              <li>Uma <strong>barra preta flutuante</strong> aparecerá na parte inferior da tela.</li>
              <li>Escolha a ação desejada:
                 <ul className="list-disc list-inside ml-4 mt-1">
                    <li><strong>Novo/Top:</strong> Adiciona ou remove as etiquetas de destaque.</li>
                    <li><strong>Preço:</strong> Permite aumentar/diminuir valor em % ou definir valor fixo para todos.</li>
                    <li><strong>Marca/Categoria:</strong> Define a mesma marca ou categoria para todos os selecionados.</li>
                 </ul>
              </li>
              <li>Clique em Salvar/Confirmar.</li>
            </ol>
          </div>
        ),
      },
      {
        title: 'O que é o Matcher de Fotos e como usar?',
        content: (
          <div className="space-y-2">
            <p>O <strong>Matcher</strong> é uma ferramenta visual para organizar produtos que foram importados sem foto:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2 text-gray-600">
              <li>Acesse a página clicando no botão <strong>Vincular</strong> no topo da lista de produtos.</li>
              <li>À esquerda, você verá seus produtos sem imagem. À direita, as fotos que você carregou mas não vinculou.</li>
              <li>Simplesmente <strong>arraste a foto</strong> da direita e solte em cima do produto correspondente na esquerda.</li>
              <li>O sistema salva automaticamente!</li>
            </ol>
            <Link href="/dashboard/products/matcher" className="inline-flex items-center text-sm text-indigo-600 hover:underline mt-2">
               Ir para o Matcher <LinkIcon size={14} className="ml-1"/>
            </Link>
          </div>
        ),
      },
      {
        title: 'Como cadastrar um produto individual?',
        content: (
          <div className="space-y-2">
            <p>Para adicionar um único produto novo:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2 text-gray-600">
              <li>Vá até o menu <strong>Produtos</strong>.</li>
              <li>Clique no botão <strong>+ Novo Produto</strong> no topo direito.</li>
              <li>Preencha o nome, preço e referência. Agora você também pode adicionar uma <strong>Ficha Técnica</strong> detalhada.</li>
              <li>Se a gestão de estoque estiver ativa, defina a quantidade inicial.</li>
              <li>Clique em <strong>Salvar</strong>.</li>
            </ol>
          </div>
        ),
      },
      {
        title: 'Como gerar um Catálogo em PDF?',
        content: (
          <div className="space-y-2">
            <p>Você pode criar um PDF profissional para enviar aos clientes:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
              <li>Na lista de produtos, clique no botão <strong>PDF</strong> no topo.</li>
              <li>Se quiser um catálogo parcial, selecione primeiro os produtos desejados usando as caixas de seleção.</li>
              <li>No modal que abrir, escolha se deseja exibir os <strong>Preços</strong> e qual o <strong>Tamanho das Fotos</strong> (Zoom de 1x a 5x).</li>
              <li>Clique em Baixar. O PDF incluirá sua logo e contatos automaticamente.</li>
            </ul>
          </div>
        ),
      },
    ],
  },
  {
    id: 'stock',
    title: 'Estoque e Logística',
    icon: Archive,
    color: 'text-yellow-600 bg-yellow-50',
    articles: [
      {
        title: 'Como ativar o Controle de Estoque?',
        content: (
          <div className="space-y-2">
            <p>Por padrão, o estoque é infinito. Para controlar quantidades:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2 text-gray-600">
              <li>Vá em <strong>Configurações</strong> {'>'} aba <strong>Estoque & Logística</strong>.</li>
              <li>Ative a opção <strong>Ativar Gestão de Estoque</strong>.</li>
              <li>Agora, ao editar um produto, você verá o campo "Quantidade".</li>
            </ol>
          </div>
        ),
      },
      {
        title: 'O que é "Venda sem Estoque" (Backorder)?',
        content: 
          'Na aba de Estoque, a opção "Permitir Venda sem Estoque" define o comportamento quando a quantidade chega a zero. Se ativada, o cliente pode continuar comprando (saldo negativo/encomenda). Se desativada, o botão de compra muda para "Esgotado" na loja.',
      }
    ]
  },
  {
    id: 'orders',
    title: 'Pedidos e Vendas',
    icon: ShoppingBag,
    color: 'text-green-600 bg-green-50',
    articles: [
      {
        title: 'Como lançar uma Venda Manual?',
        content: (
          <div className="space-y-2">
            <p>Para vendas de balcão ou telefone:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2 text-gray-600">
              <li>Vá em <strong>Pedidos</strong> e clique em <strong>Nova Venda</strong>.</li>
              <li>Identifique o cliente (Nome/Telefone).</li>
              <li>Adicione produtos do catálogo ou use a aba <strong>Item Avulso</strong> para digitar um produto na hora (ex: taxa de entrega).</li>
              <li>Ao finalizar, o estoque será baixado automaticamente.</li>
            </ol>
          </div>
        ),
      },
      {
        title: 'Status do Pedido e Aprovação',
        content: (
          <ul className="space-y-2 text-gray-600 ml-2">
            <li><span className="font-bold text-yellow-600">Pendente:</span> Novo pedido recebido. O estoque está reservado.</li>
            <li><span className="font-bold text-blue-600">Confirmado:</span> Você clicou em "Aprovar Pedido". Significa que o pagamento/negociação está ok.</li>
            <li><span className="font-bold text-green-600">Entregue:</span> O produto chegou ao cliente.</li>
            <li><span className="font-bold text-red-600">Cancelado:</span> A venda não ocorreu. <strong>Nota:</strong> Cancelar não devolve o estoque automaticamente por segurança.</li>
          </ul>
        ),
      },
    ],
  },
  {
    id: 'settings',
    title: 'Personalização da Loja',
    icon: Settings,
    color: 'text-orange-600 bg-orange-50',
    articles: [
      {
        title: 'Como mudar as Cores e Identidade?',
        content: 
          'Vá em Configurações > Aparência. Lá você pode definir a "Cor Primária" (botões e destaques), "Cor Secundária" (detalhes e preços) e a "Cor de Fundo do Cabeçalho". O catálogo atualiza imediatamente.',
      },
      {
        title: 'Configurações de Exibição',
        content: (
          <div className="space-y-2">
            <p>Na aba <strong>Exibição</strong> das configurações, você pode ligar/desligar:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
              <li><strong>Parcelamento:</strong> Exibe "ou 12x de R$..." nos produtos.</li>
              <li><strong>Tags de Desconto:</strong> Mostra selos de "% OFF" e calcula o preço à vista automaticamente.</li>
              <li><strong>Barra de Benefícios:</strong> A faixa no topo do site (ex: "Frete Grátis").</li>
            </ul>
          </div>
        ),
      },
      {
        title: 'Alterar o Link da Loja (Slug)',
        content: 'Na aba Geral, você pode alterar o endereço da sua loja (ex: repvendas.com/catalog/sua-loja). Cuidado: ao mudar, os links antigos enviados deixarão de funcionar.',
      }
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
    if (searchTerm) return; 
    setOpenCategory(openCategory === id ? null : id);
  };

  const toggleArticle = (title: string) => {
    setOpenArticle(openArticle === title ? null : title);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="text-center space-y-4 py-8">
        <div className="inline-flex p-4 bg-indigo-50 rounded-full text-indigo-600 mb-2">
           <HelpCircle size={32} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          Central de Ajuda
        </h1>
        <p className="text-gray-500 max-w-lg mx-auto">
          Tutoriais e guias rápidos sobre as novas funcionalidades do seu sistema.
        </p>

        {/* Barra de Busca */}
        <div className="relative max-w-xl mx-auto mt-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Buscar por 'estoque', 'pdf', 'cores'..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-full border border-gray-300 py-3 pl-12 pr-6 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-gray-800 placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Conteúdo */}
      <div className="grid gap-6">
        {filteredCategories.length === 0 && (
            <div className="text-center py-10 text-gray-400">
                <p>Nenhum resultado encontrado para "{searchTerm}"</p>
            </div>
        )}

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
                    {category.articles.length} guias disponíveis
                  </p>
                </div>
              </div>
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
              className={`border-t border-gray-100 bg-gray-50/50 ${
                openCategory === category.id || searchTerm ? 'block' : 'hidden'
              }`}
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
                        className="text-gray-300 group-hover:text-indigo-500"
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
      </div>

      {/* Rodapé de Suporte */}
      <div className="bg-indigo-900 rounded-2xl p-8 text-white text-center mt-12 relative overflow-hidden">
        <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2">Ainda precisa de ajuda?</h3>
            <p className="text-indigo-200 mb-6 max-w-md mx-auto">
            Nossa equipe de suporte está pronta para tirar suas dúvidas e ajudar a configurar sua loja.
            </p>
            <a
            href="https://wa.me/55SEUNUMERO"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-white text-indigo-900 px-6 py-3 rounded-lg font-bold hover:bg-indigo-50 transition-colors shadow-lg"
            >
            <PlayCircle size={20} /> Falar no WhatsApp
            </a>
        </div>
        
        {/* Decoração de Fundo */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white rounded-full mix-blend-overlay blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-400 rounded-full mix-blend-overlay blur-3xl"></div>
        </div>
      </div>
    </div>
  );
}