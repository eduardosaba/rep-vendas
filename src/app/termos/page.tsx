import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, FileText, ShieldCheck, Scale, Globe } from 'lucide-react';
import HeroDemoCTA from '@/components/HeroDemoCTA';
import { SYSTEM_LOGO_URL } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Termos de Uso | RepVendas',
  description: 'regras e condições de utilização da plataforma RepVendas',
};

export default function TermsPage() {
  const lastUpdate = "10 de Março de 2026";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d1b2c] font-sans">
      {/* Header (igual ao Landing) */}
      <nav className="fixed top-0 w-full bg-[#0d1b2c]/95 backdrop-blur-md z-50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <img
                src={SYSTEM_LOGO_URL}
                alt="Rep-Vendas"
                className="h-10 sm:h-12 w-auto object-contain"
              />
            </Link>
          </div>

          <div className="hidden lg:flex items-center gap-8">
            <Link
              href="/"
              className="text-gray-300 hover:text-white transition-colors font-medium text-sm uppercase tracking-wide"
            >
              Benefícios
            </Link>

            <HeroDemoCTA
              href="https://www.repvendas.com.br/catalogo/teste"
              label="Catálogo Demo"
              className="text-gray-300 hover:text-white transition-colors font-medium text-sm uppercase tracking-wide flex items-center gap-1"
            />

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

          <div className="flex lg:hidden items-center gap-2">
            <Link
              href="/login"
              className="text-white font-bold hover:text-[#b9722e] transition-colors text-sm px-3 py-2"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="bg-[#b9722e] text-white px-4 py-2 rounded-full font-bold hover:bg-[#a06025] transition-all shadow-lg text-sm"
            >
              Teste Grátis
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        {/* Cabeçalho da Página */}
        <header className="mb-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-orange-100 dark:bg-orange-900/30 text-[#b9722e] mb-6">
            <Scale size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[#0d1b2c] dark:text-white mb-4 tracking-tight">
            Termos de Uso
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            Última atualização: <span className="text-[#b9722e]">{lastUpdate}</span>
          </p>
        </header>

        {/* Conteúdo em Cards */}
        <div className="space-y-8">
          <section className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
            <h2 className="flex items-center gap-3 text-xl font-bold text-[#0d1b2c] dark:text-white mb-6">
              <ShieldCheck className="text-[#b9722e]" /> 1. Aceitação dos Termos
            </h2>
            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 leading-relaxed">
              <p>
                Ao acessar e utilizar a plataforma <strong>RepVendas</strong>, você concorda expressamente em cumprir e respeitar as condições estabelecidas nestes Termos de Uso. Este sistema é destinado a representantes comerciais e empresas que buscam otimizar a gestão de catálogos e pedidos.
              </p>
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
            <h2 className="flex items-center gap-3 text-xl font-bold text-[#0d1b2c] dark:text-white mb-6">
              <Globe className="text-[#b9722e]" /> 2. Uso da Plataforma
            </h2>
            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 leading-relaxed space-y-4">
              <p>
                O usuário é responsável pela veracidade dos dados cadastrados e pelo uso ético das ferramentas de compartilhamento de catálogos. É proibido:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Utilizar a plataforma para fins ilícitos ou fraudulentos;</li>
                <li>Violar direitos de propriedade intelectual das marcas exibidas;</li>
                <li>Tentar burlar sistemas de segurança da Torre de Controle.</li>
              </ul>
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
            <h2 className="flex items-center gap-3 text-xl font-bold text-[#0d1b2c] dark:text-white mb-6">
              <FileText className="text-[#b9722e]" /> 3. Limitação de Responsabilidade
            </h2>
            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 leading-relaxed">
              <p>
                O RepVendas atua como uma ferramenta facilitadora. Não nos responsabilizamos por negociações comerciais realizadas entre representantes e seus clientes finais, nem por oscilações de estoque não sincronizadas manualmente pelo usuário.
              </p>
            </div>
          </section>

          {/* Rodapé Interno */}
          <footer className="text-center pt-12">
            <p className="text-sm text-slate-400 mb-8">
              Dúvidas sobre nossos termos? Entre em contato com nosso suporte jurídico.
            </p>
            <Link 
              href="/register" 
              className="inline-flex items-center justify-center px-8 py-4 bg-[#b9722e] hover:bg-[#9a5e24] text-white rounded-2xl font-bold transition-all shadow-lg shadow-orange-200 dark:shadow-none active:scale-95"
            >
              Aceitar e Criar Conta
            </Link>
          </footer>
        </div>
      </main>
      {/* Site Footer */}
      <footer className="bg-[#0d1b2c] text-gray-400 py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <img
              src={SYSTEM_LOGO_URL}
              alt="Rep-Vendas"
              className="h-10 md:h-12 w-auto opacity-90 hover:opacity-100 transition-all object-contain"
            />
          </div>
          <div className="text-sm flex gap-6">
            <Link href="/termos" className="hover:text-white transition-colors">
              Termos de Uso
            </Link>
            <Link href="/privacidade" className="hover:text-white transition-colors">
              Privacidade
            </Link>
            <Link href="/suporte" className="hover:text-white transition-colors">
              Suporte
            </Link>
          </div>
          <p className="text-sm">© 2025 Rep-Vendas. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}