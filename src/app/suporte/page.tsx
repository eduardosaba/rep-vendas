import { Metadata } from 'next';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Mail, 
  MessageCircle, 
  BookOpen, 
  HelpCircle, 
  Clock,
  ExternalLink
} from 'lucide-react';
  import HeroDemoCTA from '@/components/HeroDemoCTA';
  import { SYSTEM_LOGO_URL } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Suporte | RepVendas',
  description: 'Central de Ajuda e Suporte do RepVendas',
};

export default function SupportPage() {
  const supportEmail = "sac.repvendas@gmail.com";

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

      <main className="max-w-5xl mx-auto px-6 py-12 md:py-20">
        {/* Cabeçalho da Central de Ajuda */}
        <header className="mb-16 text-center">
          <h1 className="text-4xl md:text-5xl font-black text-[#0d1b2c] dark:text-white mb-4 tracking-tight">
            Como podemos <span className="text-[#b9722e]">ajudar?</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto">
            Seja bem-vindo à nossa Central de Suporte. Escolha um dos canais abaixo para solucionar suas dúvidas ou problemas técnicos.
          </p>
        </header>

        {/* Grade de Canais de Atendimento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Card: Email */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center group hover:border-[#b9722e] transition-all">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-900/30 text-[#b9722e] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Mail size={28} />
            </div>
            <h3 className="text-lg font-bold text-[#0d1b2c] dark:text-white mb-2">E-mail Sac</h3>
            <p className="text-sm text-slate-500 mb-6 flex-1">
              Ideal para solicitações formais e dúvidas técnicas detalhadas.
            </p>
            <a 
              href={`mailto:${supportEmail}`}
              className="text-sm font-black text-[#b9722e] hover:underline flex items-center gap-1"
            >
              {supportEmail} <ExternalLink size={14} />
            </a>
          </div>

          {/* Card: WhatsApp / Chat */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center group hover:border-[#b9722e] transition-all">
            <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <MessageCircle size={28} />
            </div>
            <h3 className="text-lg font-bold text-[#0d1b2c] dark:text-white mb-2">Atendimento Rápido</h3>
            <p className="text-sm text-slate-500 mb-6 flex-1">
              Fale diretamente com um consultor para auxílio em tempo real.
            </p>
            <a
              href="https://wa.me/5575981272323?text=Ol%C3%A1%2C%20preciso%20de%20suporte%20pelo%20RepVendas"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#25D366] text-white text-sm font-bold transition-shadow hover:shadow-lg"
            >
              <MessageCircle size={14} />
              Falar no WhatsApp
            </a>
          </div>

          {/* Card: Manual Ajuda */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center group hover:border-[#b9722e] transition-all">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <BookOpen size={28} />
            </div>
            <h3 className="text-lg font-bold text-[#0d1b2c] dark:text-white mb-2">Manual de Ajuda</h3>
            <p className="text-sm text-slate-500 mb-6 flex-1">
              Tutoriais passo a passo para você dominar o Sistema.
            </p>
            <Link
              href="/documentacao"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-bold hover:shadow-lg transition-colors"
            >
              <BookOpen size={14} />
              Acessar Manual
            </Link>
          </div>
        </div>

        {/* Info Extra: Horário */}
        <div className="max-w-2xl mx-auto bg-[#0d1b2c] dark:bg-slate-900 rounded-[2rem] p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-[#b9722e] p-3 rounded-2xl">
              <Clock size={24} />
            </div>
            <div>
              <p className="font-bold text-sm">Horário de Atendimento</p>
              <p className="text-xs text-slate-400">Segunda a Sexta, das 09:00 às 18:00</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
            <HelpCircle size={16} className="text-[#b9722e]" />
            Tempo médio de resposta: 4 horas
          </div>
        </div>

        {/* CTA Final */}
        <footer className="mt-20 text-center">
          <h2 className="text-xl font-bold text-[#0d1b2c] dark:text-white mb-6">Ainda tem dúvidas?</h2>
          <Link 
            href="/register" 
            className="inline-flex items-center justify-center px-10 py-4 bg-[#b9722e] hover:bg-[#9a5e24] text-white rounded-2xl font-bold transition-all shadow-lg shadow-orange-200 dark:shadow-none active:scale-95"
          >
            Explorar Plataforma
          </Link>
        </footer>
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