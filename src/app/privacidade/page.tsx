import { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  EyeOff,
  Database,
  UserCheck,
} from 'lucide-react';
import HeroDemoCTA from '@/components/HeroDemoCTA';
import { SYSTEM_LOGO_URL } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Política de Privacidade | RepVendas',
  description: 'Saiba como o RepVendas protege e trata os seus dados pessoais.',
};

export default function PrivacyPage() {
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
        {/* Cabeçalho */}
        <header className="mb-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-orange-100 dark:bg-orange-900/30 text-[#b9722e] mb-6">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[#0d1b2c] dark:text-white mb-4 tracking-tight">
            Privacidade de <span className="text-[#b9722e]">Dados</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            Sua confiança é nossa prioridade. Atualizado em: {lastUpdate}
          </p>
        </header>

        {/* Conteúdo em Cards Estilizados */}
        <div className="grid gap-8">
          
          <section className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md">
            <h2 className="flex items-center gap-3 text-xl font-bold text-[#0d1b2c] dark:text-white mb-6">
              <Database className="text-[#b9722e]" /> 1. Coleta de Informações
            </h2>
            <div className="text-slate-600 dark:text-slate-400 leading-relaxed space-y-4">
              <p>
                Coletamos apenas os dados essenciais para o funcionamento da sua conta, como:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Informações de cadastro (Nome, E-mail e Telefone);</li>
                <li>Dados da sua empresa e logomarcas para personalização do catálogo;</li>
                <li>Registros de acesso para garantir a segurança da Torre de Controle.</li>
              </ul>
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md">
            <h2 className="flex items-center gap-3 text-xl font-bold text-[#0d1b2c] dark:text-white mb-6">
              <Lock className="text-[#b9722e]" /> 2. Segurança e Armazenamento
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Utilizamos tecnologias de criptografia de ponta e infraestrutura de nuvem segura (Supabase/PostgreSQL) para garantir que seus dados e catálogos estejam protegidos contra acessos não autorizados. Seus dados de vendas são privados e nunca compartilhados com terceiros.
            </p>
          </section>

          <section className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md">
            <h2 className="flex items-center gap-3 text-xl font-bold text-[#0d1b2c] dark:text-white mb-6">
              <EyeOff className="text-[#b9722e]" /> 3. Seus Direitos (LGPD)
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Em conformidade com a Lei Geral de Proteção de Dados (LGPD), você possui o direito de acessar, corrigir ou excluir seus dados a qualquer momento através do painel de configurações ou solicitando via nosso canal de suporte.
            </p>
          </section>

          <div className="bg-[#0d1b2c] dark:bg-[#b9722e] rounded-[2.5rem] p-10 text-white flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <h3 className="text-2xl font-black mb-2">Transparência Total</h3>
              <p className="text-slate-300 dark:text-white/80 text-sm">
                Não vendemos seus dados. Nosso modelo de negócio é baseado em fornecer a melhor ferramenta de vendas para você, não em comercializar informações.
              </p>
            </div>
            <UserCheck size={64} className="opacity-20 hidden md:block" />
          </div>

          {/* Botão de Retorno */}
          <footer className="text-center pt-12">
            <Link 
              href="/register" 
              className="inline-flex items-center justify-center px-10 py-4 bg-[#b9722e] hover:bg-[#9a5e24] text-white rounded-2xl font-bold transition-all shadow-lg shadow-orange-200 dark:shadow-none active:scale-95"
            >
              Concordo com a Política
            </Link>
            <p className="mt-6 text-xs text-slate-400 uppercase tracking-widest font-bold">
              RepVendas &bull; Proteção de Dados 2026
            </p>
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