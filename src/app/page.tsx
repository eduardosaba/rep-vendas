import { Metadata } from 'next';
import Link from 'next/link';
import { SYSTEM_LOGO_URL } from '@/lib/constants';
import LandingClientWrapper from '@/components/landing/LandingClientWrapper';
import { LandingFAQ } from '@/components/landing/LandingFAQ';
import {
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Smartphone,
  Globe,
  ShieldCheck,
  Zap,
  Layout,
  FileX,
  MessageSquare,
  PackageCheck,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'RepVendas | Catálogo Digital para Representantes Comerciais',
  description:
    'Transforme sua lista de produtos em um catálogo digital profissional, compartilhe com seus clientes e receba pedidos organizados no WhatsApp.',
  openGraph: {
    title: 'RepVendas | Catálogo Digital para Representantes Comerciais',
    description:
      'Crie seu catálogo digital profissional, compartilhe com seus clientes e receba pedidos organizados.',
    images: [SYSTEM_LOGO_URL],
  },
};

export default function LandingPage() {
  // Real factual JSON-LD Structured Data for Organization and SoftwareApplication
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'RepVendas',
      url: 'https://www.repvendas.com.br',
      logo: SYSTEM_LOGO_URL,
      description:
        'Plataforma de catálogo digital e gestão de pedidos para representantes comerciais e distribuidoras.',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'RepVendas',
      operatingSystem: 'Web, iOS, Android',
      applicationCategory: 'BusinessApplication',
      description:
        'Sistema de catálogo digital profissional e gestão de pedidos para representantes comerciais e distribuidoras.',
    },
  ];

  return (
    <LandingClientWrapper jsonLd={jsonLd}>
      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-32 px-4 overflow-hidden bg-[#0d1b2c]">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#b9722e] rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-pulse"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-primary rounded-full mix-blend-screen filter blur-[120px] opacity-10"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-[#b9722e] text-sm font-bold mb-8 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-[#b9722e] animate-ping"></span>
            Abandone o PDF. Venda com inteligência.
          </div>

          {/* H1 ÚNICO E PADRONIZADO DA HOME */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight mb-8 leading-tight max-w-5xl mx-auto">
            Seu catálogo digital, seus clientes e seus pedidos em um só lugar.
          </h1>

          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed font-light">
            Transforme sua lista de produtos em um catálogo digital profissional,
            compartilhe com seus clientes e receba pedidos organizados sem depender
            de PDFs e digitação manual.
          </p>

          {/* CTAs do Hero */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-2xl mx-auto">
            <button
              data-open-lead-modal="true"
              className="w-full sm:w-auto px-8 py-4 bg-[#b9722e] text-white rounded-full font-bold text-lg hover:bg-[#a06025] transition-all shadow-xl shadow-orange-900/30 flex items-center justify-center gap-2 hover:-translate-y-1 cursor-pointer"
            >
              Criar meu catálogo <ArrowRight size={20} />
            </button>

            <a
              href="/catalogo/teste"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-4 bg-transparent border border-white/30 text-white rounded-full font-bold text-base hover:bg-white/10 transition-all backdrop-blur-sm flex items-center justify-center gap-2"
            >
              Ver Catálogo Demo
            </a>

            <a
              href="/demo/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-4 bg-transparent border border-white/30 text-white rounded-full font-bold text-base hover:bg-white/10 transition-all backdrop-blur-sm flex items-center justify-center gap-2"
            >
              Ver Painel Demo
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-[#b9722e]" /> Sem cartão de crédito
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-[#b9722e]" /> Configure com sua marca
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-[#b9722e]" /> Importe seus produtos
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-[#b9722e]" /> Compartilhe com clientes
            </span>
          </div>

          {/* Visual Mockup em Video Autoplay Loop */}
          <div className="mt-16 relative mx-auto max-w-5xl">
            <div className="relative rounded-2xl bg-[#1a2c45] p-2 shadow-2xl border border-white/10">
              <div className="bg-white rounded-xl overflow-hidden shadow-inner">
                <div className="h-8 bg-gray-100 border-b flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <div className="flex-1 mx-4 bg-white h-5 rounded border text-[10px] flex items-center px-2 text-gray-400 font-mono">
                    repvendas.com.br/catalogo/sua-empresa
                  </div>
                </div>
                <div className="relative aspect-video bg-gray-900 overflow-hidden">
                  <video
                    src={
                      process.env.NEXT_PUBLIC_CLOUDINARY_VIDEO_URL ||
                      '/dashboardRepvendas.mp4'
                    }
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- SEÇÃO PROBLEMA X SOLUÇÃO --- */}
      <section className="py-20 bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-[#b9722e] font-bold tracking-wide uppercase text-xs sm:text-sm mb-2">
              Transformação Comercial
            </h2>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0d1b2c]">
              Pare de vender com processos improvisados
            </h2>
            <p className="text-gray-600 mt-3 max-w-2xl mx-auto text-base sm:text-lg">
              Veja como o RepVendas moderniza a rotina comercial do representante.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-4 font-bold">
                <FileX size={24} />
              </div>
              <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-1">
                Antes (PDF)
              </h3>
              <p className="text-gray-900 font-bold text-lg mb-2">
                Catálogo desatualizado e pesado
              </p>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                PDFs gigantes que os clientes não conseguem abrir no celular e que ficam desatualizados a cada mudança de preço.
              </p>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold text-green-600 uppercase tracking-wider mb-1">
                  Com o RepVendas
                </h3>
                <p className="text-gray-900 font-bold text-base mb-1">
                  Catálogo online sempre disponível
                </p>
                <p className="text-gray-600 text-sm">
                  Seu cliente acessa via link, visualiza preços atualizados e navega com agilidade.
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-4 font-bold">
                <MessageSquare size={24} />
              </div>
              <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-1">
                Antes (Digitação Manual)
              </h3>
              <p className="text-gray-900 font-bold text-lg mb-2">
                Pedidos confusos pelo WhatsApp
              </p>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Mensagens soltas, áudios com referências erradas e horas gastas digitando pedidos manualmente.
              </p>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold text-green-600 uppercase tracking-wider mb-1">
                  Com o RepVendas
                </h3>
                <p className="text-gray-900 font-bold text-base mb-1">
                  Pedido montado e organizado
                </p>
                <p className="text-gray-600 text-sm">
                  O próprio cliente seleciona os itens e envia o carrinho estruturado diretamente para você.
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-4 font-bold">
                <PackageCheck size={24} />
              </div>
              <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-1">
                Antes (Produtos Espalhados)
              </h3>
              <p className="text-gray-900 font-bold text-lg mb-2">
                Fotos e tabelas desconectadas
              </p>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Fotos na galeria do celular e tabelas de preços em arquivos separados, gerando dúvidas frequentes.
              </p>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold text-green-600 uppercase tracking-wider mb-1">
                  Com o RepVendas
                </h3>
                <p className="text-gray-900 font-bold text-base mb-1">
                  Ambiente único e profissional
                </p>
                <p className="text-gray-600 text-sm">
                  Fotos, referências e condições de pagamento reunidos em um único ambiente comercial.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- SEÇÃO PRINCIPAIS BENEFÍCIOS --- */}
      <section id="beneficios" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-[#b9722e] font-bold tracking-wide uppercase text-xs sm:text-sm mb-2">
              Recursos de Alto Impacto
            </h2>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0d1b2c]">
              Tudo o que você precisa para vender mais
            </h2>
            <p className="text-gray-500 mt-3 max-w-2xl mx-auto text-lg">
              Apresentação impecável, controle de acesso e pedidos organizados em um só lugar.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Globe}
              title="Catálogo Profissional"
              description="Apresente seus produtos de forma organizada e atualizada. Seu cliente navega com facilidade em qualquer dispositivo."
            />
            <FeatureCard
              icon={Smartphone}
              title="Importação Facilitada"
              description="Importe sua relação de produtos via planilha e organize seu catálogo visual em poucos cliques."
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Preços Protegidos"
              description="Controle quem pode visualizar suas informações comerciais ativando a proteção por senha no catálogo."
            />
            <FeatureCard
              icon={BarChart3}
              title="Gestão Comercial"
              description="Acompanhe produtos, status de pedidos e histórico de atendimento no seu Painel Administrativo."
            />
            <FeatureCard
              icon={Layout}
              title="Pedido Organizado"
              description="Seu cliente seleciona a quantidade, adiciona ao carrinho e você recebe a lista final estruturada."
            />
            <FeatureCard
              icon={Zap}
              title="Integração com WhatsApp"
              description="Mantenha o canal de comunicação que seus clientes já utilizam, eliminando erros de digitação."
            />
          </div>
        </div>
      </section>

      {/* --- SEÇÃO COMO COMEÇAR --- */}
      <section id="como-funciona" className="py-24 bg-[#0d1b2c] text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-[#b9722e] font-bold tracking-wide uppercase text-xs sm:text-sm mb-2">
              Jornada Simples
            </h2>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Do cadastro ao seu catálogo em poucos passos
            </h2>
          </div>

          <div className="grid md:grid-cols-5 gap-6">
            {[
              {
                step: '01',
                title: 'Informe seus dados',
                desc: 'Preencha suas informações comerciais básicas.',
              },
              {
                step: '02',
                title: 'Personalize com sua marca',
                desc: 'Suba sua logo e defina suas cores principais.',
              },
              {
                step: '03',
                title: 'Adicione seus produtos',
                desc: 'Importe sua lista e vincule as fotos dos itens.',
              },
              {
                step: '04',
                title: 'Publique seu catálogo',
                desc: 'Defina as regras de exibição e proteção de preço.',
              },
              {
                step: '05',
                title: 'Compartilhe e venda',
                desc: 'Envie o link do catálogo para sua carteira de clientes.',
              },
            ].map((s) => (
              <div
                key={s.step}
                className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:border-[#b9722e]/50 transition-all"
              >
                <div className="text-3xl font-extrabold text-[#b9722e] mb-3">
                  {s.step}
                </div>
                <h3 className="font-bold text-lg mb-2 text-white">{s.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FAQ SEO & COMERCIAL --- */}
      <LandingFAQ />

      {/* --- CTA FINAL --- */}
      <section className="py-24 bg-gray-50 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-[#0d1b2c] mb-6">
            Seu próximo catálogo não precisa ser um PDF.
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Configure o RepVendas com sua identidade, organize seus produtos e
            entregue aos seus clientes uma experiência profissional de compra.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-2xl mx-auto">
            <button
              data-open-lead-modal="true"
              className="w-full sm:w-auto px-8 py-5 bg-[#b9722e] text-white rounded-full font-bold text-xl hover:bg-[#a06025] transition-all shadow-xl hover:-translate-y-1 flex items-center justify-center gap-3 cursor-pointer"
            >
              Criar meu catálogo <ArrowRight size={22} />
            </button>
            <a
              href="/catalogo/teste"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-5 bg-white border border-gray-300 text-gray-800 rounded-full font-bold text-base hover:bg-gray-100 transition-all flex items-center justify-center"
            >
              Ver Catálogo Demo
            </a>
            <a
              href="/demo/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-5 bg-white border border-gray-300 text-gray-800 rounded-full font-bold text-base hover:bg-gray-100 transition-all flex items-center justify-center"
            >
              Ver Painel Demo
            </a>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-[#0d1b2c] text-gray-400 py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <img
              src={SYSTEM_LOGO_URL}
              alt="RepVendas"
              className="h-10 md:h-12 w-auto object-contain"
            />
          </div>
          <div className="text-sm flex gap-6">
            <Link href="/termos" className="hover:text-white transition-colors">
              Termos de Uso
            </Link>
            <Link href="/privacidade" className="hover:text-white transition-colors">
              Política de Privacidade
            </Link>
            <Link href="/suporte" className="hover:text-white transition-colors">
              Suporte
            </Link>
          </div>
          <p className="text-sm">
            © 2026 RepVendas. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </LandingClientWrapper>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-[#b9722e]/30 transition-all duration-300 group">
      <div className="w-12 h-12 bg-orange-50 text-[#b9722e] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
        <Icon size={26} />
      </div>
      <h3 className="text-xl font-bold text-[#0d1b2c] mb-3 group-hover:text-[#b9722e] transition-colors">
        {title}
      </h3>
      <p className="text-gray-500 leading-relaxed text-sm">{description}</p>
    </div>
  );
}
