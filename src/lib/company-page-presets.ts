import type { CompanyPageBlock } from './company-page-content';

export interface CompanyPagePreset {
  id: string;
  title: string;
  description: string;
  category: string;
  badge?: string;
  createBlocks: () => CompanyPageBlock[];
}

export function generatePresetBlocks(presetId: string): CompanyPageBlock[] {
  const genId = () => crypto.randomUUID();

  switch (presetId) {
    case 'institucional':
      return [
        {
          id: genId(),
          type: 'banner',
          data: {
            title: 'Sua Empresa com Tradição e Excelência',
            subtitle: 'Conheça nossa história, compromisso com a qualidade e valores que nos movem.',
            ctaText: 'Fale com Nossos Especialistas',
            ctaUrl: '#contato',
          },
        },
        {
          id: genId(),
          type: 'text',
          data: {
            text: 'Há mais de 15 anos atuamos como referência no mercado, oferecendo portfólio completo de produtos com atendimento personalizado e agilidade nas entregas.',
            align: 'center',
          },
        },
        {
          id: genId(),
          type: 'stats',
          data: {
            title: 'Nossos Números',
            statsColumns: 3,
            statsItems: [
              { id: genId(), number: '+15.000', label: 'Clientes Atendidos' },
              { id: genId(), number: '98%', label: 'Satisfação Garantida' },
              { id: genId(), number: '24h', label: 'Despacho Rápido' },
            ],
          },
        },
        {
          id: genId(),
          type: 'testimonials',
          data: {
            title: 'O que Nossos Parceiros Dizem',
            testimonialItems: [
              {
                id: genId(),
                author: 'Carlos Eduardo',
                role: 'Diretor de Compras',
                content: 'Parceria exemplar. Entregas no prazo e excelente suporte comercial.',
                rating: 5,
              },
              {
                id: genId(),
                author: 'Mariana Silva',
                role: 'Gerente de Estoque',
                content: 'Qualidade constante e portfólio sempre atualizado com lançamentos.',
                rating: 5,
              },
            ],
          },
        },
        {
          id: genId(),
          type: 'contact',
          data: {
            useCompanyDefaults: true,
          },
        },
      ];

    case 'launches_hotsite':
      return [
        {
          id: genId(),
          type: 'banner',
          data: {
            title: 'Lançamentos da Temporada',
            subtitle: 'Confira em primeira mão as últimas novidades e tendências do nosso catálogo.',
            ctaText: 'Ver Produtos',
            ctaUrl: '#produtos-lancamento',
          },
        },
        {
          id: genId(),
          type: 'heading',
          data: {
            text: 'Novidades em Destaque',
            level: 'h2',
            align: 'center',
          },
        },
        {
          id: genId(),
          type: 'products',
          data: {
            productsTitle: 'Lançamentos Exclusivos',
            productsSource: 'launches',
            productsLimit: 8,
            productsLayout: 'grid',
          },
        },
        {
          id: genId(),
          type: 'faq',
          data: {
            faqTitle: 'Dúvidas Sobre Pedidos de Lançamentos',
            faqItems: [
              {
                id: genId(),
                question: 'Qual o prazo de faturamento dos lançamentos?',
                answer: 'Os produtos marcados como lançamento possuem prioridade na expedição e são faturados em até 24h úteis.',
              },
              {
                id: genId(),
                question: 'Existe quantidade mínima por item?',
                answer: 'As condições de lote mínimo seguem a tabela padrão da sua conta comercial.',
              },
            ],
          },
        },
        {
          id: genId(),
          type: 'contact',
          data: {
            useCompanyDefaults: true,
          },
        },
      ];

    case 'warranty_terms':
      return [
        {
          id: genId(),
          type: 'heading',
          data: {
            text: 'Política de Garantia, Trocas e Devoluções',
            level: 'h1',
            align: 'center',
          },
        },
        {
          id: genId(),
          type: 'text',
          data: {
            text: 'Nossa política de garantia visa assegurar total suporte aos nossos parceiros comerciais. Todos os produtos comercializados possuem garantia contra defeitos de fabricação mediante apresentação de nota fiscal.',
            align: 'left',
          },
        },
        {
          id: genId(),
          type: 'faq',
          data: {
            faqTitle: 'Perguntas Frequentes sobre Trocas e Assistência',
            faqItems: [
              {
                id: genId(),
                question: 'Como solicitar a troca de um produto com defeito?',
                answer: 'Entre em contato com o atendimento enviando a nota fiscal, código do produto e foto do defeito para abertura do chamado de Avaria/Troca.',
              },
              {
                id: genId(),
                question: 'Qual o prazo limite para comunicação de divergência na entrega?',
                answer: 'Divergências de volumes ou avarias aparentes no transporte devem ser anotadas no conhecimento de frete no ato do recebimento e notificadas em até 7 dias úteis.',
              },
            ],
          },
        },
        {
          id: genId(),
          type: 'contact',
          data: {
            useCompanyDefaults: true,
          },
        },
      ];

    case 'brand_showcase':
      return [
        {
          id: genId(),
          type: 'banner',
          data: {
            title: 'Nossas Marcas Parceiras',
            subtitle: 'Trabalhamos com os melhores fabricantes do mercado nacional e internacional.',
          },
        },
        {
          id: genId(),
          type: 'brands',
          data: {
            brandsTitle: 'Marcas Representadas',
            brandsSource: 'company',
            brandsColumns: 4,
          },
        },
        {
          id: genId(),
          type: 'products',
          data: {
            productsTitle: 'Produtos em Destaque no Catálogo',
            productsSource: 'featured',
            productsLimit: 8,
            productsLayout: 'grid',
          },
        },
        {
          id: genId(),
          type: 'contact',
          data: {
            useCompanyDefaults: true,
          },
        },
      ];

    default:
      return [];
  }
}

export const COMPANY_PAGE_PRESETS: CompanyPagePreset[] = [
  {
    id: 'institucional',
    title: 'Institucional Completa',
    description: 'Página institucional ideal para apresentar a empresa, história, indicadores, depoimentos e contatos.',
    category: 'Institucional',
    badge: 'Mais Utilizado',
    createBlocks: () => generatePresetBlocks('institucional'),
  },
  {
    id: 'launches_hotsite',
    title: 'Hotsite de Lançamentos',
    description: 'Foco na divulgação de novidades e lançamentos do catálogo com botão direto para o representante.',
    category: 'Vendas',
    badge: 'Destaque',
    createBlocks: () => generatePresetBlocks('launches_hotsite'),
  },
  {
    id: 'warranty_terms',
    title: 'Termos, Trocas & Garantia',
    description: 'Estrutura para comunicação de políticas de trocas, garantia e perguntas frequentes.',
    category: 'Suporte',
    createBlocks: () => generatePresetBlocks('warranty_terms'),
  },
  {
    id: 'brand_showcase',
    title: 'Vitrine de Marcas',
    description: 'Apresentação das marcas oficiais comercializadas e produtos em destaque.',
    category: 'Catálogo',
    createBlocks: () => generatePresetBlocks('brand_showcase'),
  },
];
