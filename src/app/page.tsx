import { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient as createSupabaseClient } from '@/lib/supabaseServer';
import { SYSTEM_LOGO_URL } from '@/lib/constants';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Smartphone,
  Globe,
  ShieldCheck,
  Menu,
  Zap,
  Layout,
  Users,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Rep-Vendas - O Sistema Definitivo para Representantes',
  description:
    'Transforme suas vendas com um catálogo digital profissional, pedidos automáticos e gestão completa.',
  openGraph: {
    images: [SYSTEM_LOGO_URL],
  },
};

// Evita que o Next tente prerenderizar esta página e executar fetchs no build
export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  // Verifica se já está logado para redirecionar ao Dashboard
  const supabase = await createSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect('/dashboard');
  }

  // CORES DA MARCA (Referência):
  // Principal (Fundo/Texto): #0d1b2c (Azul Noite)
  // Ação (Botões/Destaque): #b9722e (Bronze/Laranja)

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-[#b9722e] selection:text-white">
      {/* --- NAV --- */}
      <nav className="fixed top-0 w-full bg-[#0d1b2c]/95 backdrop-blur-md z-50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={SYSTEM_LOGO_URL}
              alt="Rep-Vendas"
              className="h-12 w-auto object-contain" // mostra cor original, um pouco maior
            />
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a
              href="#beneficios"
              className="text-gray-300 hover:text-white transition-colors font-medium text-sm uppercase tracking-wide"
            >
              Benefícios
            </a>
            <a
              href="#como-funciona"
              className="text-gray-300 hover:text-white transition-colors font-medium text-sm uppercase tracking-wide"
            >
              Como Funciona
            </a>
            <Link
              href="/login"
              className="text-white font-bold hover:text-[#b9722e] transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="bg-[#b9722e] text-white px-6 py-2.5 rounded-full font-bold hover:bg-[#a06025] transition-all shadow-lg shadow-orange-900/20 hover:shadow-orange-900/40 hover:-translate-y-0.5"
            >
              Testar Grátis
            </Link>
          </div>

          <button className="md:hidden p-2 text-white">
            <Menu />
          </button>
        </div>
      </nav>

      {/* --- HERO SECTION (Impacto Visual) --- */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 overflow-hidden bg-[#0d1b2c]">
        {/* Efeitos de Fundo */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#b9722e] rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-pulse"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-600 rounded-full mix-blend-screen filter blur-[120px] opacity-10"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-[#b9722e] text-sm font-bold mb-8 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-[#b9722e] animate-ping"></span>
            A revolução nas vendas B2B chegou
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-8 leading-tight">
            Abandone o PDF. <br />
            Venda com{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#b9722e] to-orange-400">
              Inteligência.
            </span>
          </h1>

          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-12 leading-relaxed font-light">
            O sistema completo para representantes comerciais. Crie seu catálogo
            digital em minutos, receba pedidos automáticos no WhatsApp e
            gerencie sua carteira de clientes em um único lugar.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 bg-[#b9722e] text-white rounded-full font-bold text-lg hover:bg-[#a06025] transition-all shadow-xl shadow-orange-900/30 flex items-center justify-center gap-2 hover:-translate-y-1"
            >
              Começar Teste Grátis <ArrowRight size={20} />
            </Link>
            <a
              href="#demonstracao"
              className="w-full sm:w-auto px-8 py-4 bg-transparent border border-white/30 text-white rounded-full font-bold text-lg hover:bg-white/10 transition-all backdrop-blur-sm"
            >
              Ver como funciona
            </a>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 size={16} className="text-[#b9722e]" /> Sem cartão
              de crédito
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 size={16} className="text-[#b9722e]" /> 14 dias
              grátis
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 size={16} className="text-[#b9722e]" /> Cancelamento
              fácil
            </span>
          </div>

          {/* Mockup do Dashboard (CSS Puro para leveza) */}
          <div className="mt-20 relative mx-auto max-w-6xl animate-fade-up">
            <div className="relative rounded-xl bg-[#1a2c45] p-2 shadow-2xl border border-white/10">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/5 to-transparent pointer-events-none rounded-xl"></div>
              {/* Janela do Browser */}
              <div className="bg-white rounded-lg overflow-hidden shadow-inner">
                {/* Barra de topo fake */}
                <div className="h-8 bg-gray-100 border-b flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <div className="flex-1 mx-4 bg-white h-5 rounded border text-[10px] flex items-center px-2 text-gray-400 font-mono">
                    repvendas.com/dashboard
                  </div>
                </div>
                {/* Conteúdo Fake */}
                <div className="p-8 bg-gray-50 grid grid-cols-4 gap-6 h-[400px] lg:h-[600px] overflow-hidden relative">
                  {/* Sidebar Fake */}
                  <div className="hidden md:block col-span-1 bg-white h-full rounded-lg border border-gray-200 p-4 space-y-3">
                    <div className="h-8 w-3/4 bg-gray-100 rounded mb-6"></div>
                    <div className="h-4 w-full bg-blue-50 rounded"></div>
                    <div className="h-4 w-full bg-gray-50 rounded"></div>
                    <div className="h-4 w-full bg-gray-50 rounded"></div>
                    <div className="h-4 w-full bg-gray-50 rounded"></div>
                  </div>
                  {/* Main Content Fake */}
                  <div className="col-span-4 md:col-span-3 space-y-6">
                    <div className="grid grid-cols-4 gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm h-24"
                        >
                          <div className="w-8 h-8 rounded bg-orange-50 mb-2"></div>
                          <div className="w-12 h-4 bg-gray-100 rounded"></div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white h-64 rounded-lg border border-gray-200 shadow-sm p-6">
                      <div className="flex items-end gap-4 h-full pb-4">
                        <div
                          className="w-full bg-blue-50 rounded-t hover:bg-blue-100 transition-all"
                          style={{ height: '40%' }}
                        ></div>
                        <div
                          className="w-full bg-blue-50 rounded-t hover:bg-blue-100 transition-all"
                          style={{ height: '70%' }}
                        ></div>
                        <div
                          className="w-full bg-[#b9722e] rounded-t shadow-lg shadow-orange-200"
                          style={{ height: '90%' }}
                        ></div>
                        <div
                          className="w-full bg-blue-50 rounded-t hover:bg-blue-100 transition-all"
                          style={{ height: '60%' }}
                        ></div>
                        <div
                          className="w-full bg-blue-50 rounded-t hover:bg-blue-100 transition-all"
                          style={{ height: '80%' }}
                        ></div>
                      </div>
                    </div>
                    {/* Overlay CTA */}
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-gray-50 via-transparent to-transparent">
                      <Link
                        href="/register"
                        className="bg-[#0d1b2c] text-white px-8 py-3 rounded-full font-bold shadow-2xl hover:scale-105 transition-transform flex items-center gap-2"
                      >
                        Ver Dashboard Real <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- LOGOS / SOCIAL PROOF --- */}
      <section className="py-10 border-b border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">
            Ideal para diversos segmentos
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            {[
              'Moda & Vestuário',
              'Calçados',
              'Cosméticos',
              'Eletrônicos',
              'Decoração',
              'Alimentos',
            ].map((item) => (
              <span
                key={item}
                className="text-xl font-bold text-gray-400 hover:text-[#b9722e] cursor-default"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* --- BENEFÍCIOS --- */}
      <section id="beneficios" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-[#b9722e] font-bold tracking-wide uppercase text-sm mb-3">
              Funcionalidades Premium
            </h2>
            <h3 className="text-4xl font-extrabold text-[#0d1b2c]">
              Tudo o que você precisa para vender mais
            </h3>
            <p className="text-gray-500 mt-4 max-w-2xl mx-auto text-lg">
              Automatize processos repetitivos e foque no que importa: o
              relacionamento com seus clientes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            <FeatureCard
              icon={Globe}
              title="Catálogo Online 24/7"
              description="Seu portfólio disponível o tempo todo. Compartilhe links personalizados e deixe o cliente montar o pedido sozinho."
            />
            <FeatureCard
              icon={Smartphone}
              title="Importação Visual"
              description="Esqueça o Excel. Cadastre produtos apenas arrastando as fotos do seu celular ou computador. O sistema organiza tudo."
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Preços Protegidos"
              description="Segurança total. Defina uma senha para o seu catálogo e garanta que apenas clientes autorizados vejam seus preços."
            />
            <FeatureCard
              icon={BarChart3}
              title="Dashboard de Gestão"
              description="Controle total. Acompanhe vendas, status de pedidos (pendente, entregue) e histórico de clientes em tempo real."
            />
            <FeatureCard
              icon={Layout}
              title="Carrinho Inteligente"
              description="Seu cliente foi interrompido? Sem problemas. O carrinho fica salvo e pode ser recuperado em outro dispositivo."
            />
            <FeatureCard
              icon={Zap}
              title="Venda no WhatsApp"
              description="Receba pedidos prontos e formatados direto no seu WhatsApp. Menos conversa fiada, mais fechamento."
            />
          </div>
        </div>
      </section>

      {/* --- COMO FUNCIONA --- */}
      <section
        id="como-funciona"
        className="py-24 bg-[#0d1b2c] text-white relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-[#b9722e] font-bold tracking-wide uppercase text-sm mb-3">
                Passo a Passo
              </h2>
              <h3 className="text-4xl font-extrabold mb-8 leading-tight">
                Comece a vender em menos de 5 minutos
              </h3>

              <div className="space-y-12">
                <Step
                  number="01"
                  title="Crie sua conta"
                  desc="Cadastro rápido, sem burocracia. Você ganha 14 dias de acesso total gratuito."
                />
                <Step
                  number="02"
                  title="Personalize sua Loja"
                  desc="Faça upload do seu logo, escolha a cor da sua marca e defina a senha de acesso."
                />
                <Step
                  number="03"
                  title="Cadastre Produtos"
                  desc="Arraste as fotos dos seus produtos. O nosso sistema cria os cartões automaticamente."
                />
                <Step
                  number="04"
                  title="Compartilhe e Venda"
                  desc="Envie o link para seus clientes. Receba os pedidos organizados no seu painel."
                />
              </div>
            </div>

            <div className="relative">
              {/* Card Flutuante Ilustrativo */}
              <div className="bg-white text-[#0d1b2c] p-8 rounded-3xl shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-6">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-lg">Novo Pedido Recebido!</p>
                    <p className="text-sm text-gray-500">
                      há 2 minutos via Catálogo
                    </p>
                  </div>
                  <div className="ml-auto font-bold text-xl">R$ 1.450,00</div>
                </div>
                <div className="space-y-3">
                  <div className="h-2 bg-gray-100 rounded w-full"></div>
                  <div className="h-2 bg-gray-100 rounded w-3/4"></div>
                  <div className="h-2 bg-gray-100 rounded w-1/2"></div>
                </div>
                <div className="mt-8">
                  <button className="w-full py-3 bg-[#0d1b2c] text-white rounded-xl font-bold">
                    Ver Detalhes
                  </button>
                </div>
              </div>
              {/* Elemento Decorativo */}
              <div className="absolute -z-10 top-10 -right-10 w-full h-full bg-[#b9722e]/20 rounded-3xl transform -rotate-6"></div>
            </div>
          </div>
        </div>
      </section>

      {/* --- CTA FINAL --- */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold text-[#0d1b2c] mb-6">
            Pronto para o próximo nível?
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Não perca mais tempo digitando pedidos manualmente. Junte-se aos
            representantes modernos.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-10 py-5 bg-[#b9722e] text-white rounded-full font-bold text-xl hover:bg-[#a06025] transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-3"
            >
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
              Criar Minha Conta Grátis
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Teste grátis de 14 dias • Sem compromisso
          </p>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-[#0d1b2c] text-gray-400 py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <img
              src={SYSTEM_LOGO_URL}
              alt="Logo"
              className="h-10 md:h-12 w-auto opacity-90 hover:opacity-100 transition-all object-contain"
            />
          </div>
          <div className="text-sm flex gap-6">
            <a href="#" className="hover:text-white transition-colors">
              Termos de Uso
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Privacidade
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Suporte
            </a>
          </div>
          <p className="text-sm">
            © 2025 Rep-Vendas. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Componente de Card de Funcionalidade
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
      <div className="w-14 h-14 bg-orange-50 text-[#b9722e] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
        <Icon size={28} />
      </div>
      <h3 className="text-xl font-bold text-[#0d1b2c] mb-3 group-hover:text-[#b9722e] transition-colors">
        {title}
      </h3>
      <p className="text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}

// Componente de Passo
function Step({
  number,
  title,
  desc,
}: {
  number: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-6">
      <div className="text-5xl font-bold text-white/10">{number}</div>
      <div>
        <h4 className="text-xl font-bold text-white mb-2">{title}</h4>
        <p className="text-gray-400 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
