'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { toast } from 'sonner';
// import useSearchParams avoided to prevent CSR bailout during prerender
// Link não usado neste componente
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowRight } from 'lucide-react';
import LoginOnboarding from '@/components/LoginOnboarding';
import Logo from '@/components/Logo';
import { loginWithGoogle, login } from '@/app/login/actions'; // Usar Server Action `login` para autenticação com perfil
// Supabase client not required on this client page (Server Action handles auth)
// toast intentionally omitted to avoid extra UI delay during redirect

// Componente de Botão
const Button = ({
  children,
  className = '',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  variant = 'primary',
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'google';
}) => {
  const baseStyle =
    'flex w-full items-center justify-center rounded-lg px-4 py-3 font-bold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70';

  const variants = {
    primary: 'bg-[#b9722e] text-white hover:bg-[#9a5e24] focus:ring-[#b9722e]',
    google:
      'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-200',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : children}
    </button>
  );
};

export default function LoginPage() {
  // router not needed when using Server Action redirects
  // Nota: evitamos `useSearchParams` para prevenir problemas de prerender.

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  // usar sonner programático

  useEffect(() => {
    // Leitura direta dos search params no cliente evita o uso de useSearchParams()
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);

    const msgType = sp.get('message_type');
    const msgText = sp.get('message_text');
    if (msgType && msgText) {
      if (msgType === 'success') toast.success(msgText);
      else toast.error(msgText);
      setLoading(false);
      setGoogleLoading(false);
      return;
    }

    const message = sp.get('message');
    if (message) {
      if (message.includes('realizado') || message.includes('Verifique')) {
        toast.success(message);
      } else {
        toast.error(message);
      }
      setLoading(false);
      setGoogleLoading(false);
    }
  }, []);

  // NOTE: Usaremos a Server Action `login(formData)` para autenticação.
  // Isso garante que o servidor realize sign-in e busque o profile,
  // retornando o redirect correto (admin/dashboard) sem "piscar" a rota.

  // UseTransition + loading: fornecer feedback imediato ao usuário
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    // Evitar múltiplos envios
    if (loading || isPending) {
      e.preventDefault();
      return;
    }

    // Validação cliente básica
    const emailTrim = String(email || '').trim();
    if (!emailTrim) {
      e.preventDefault();
      setError('Por favor, informe seu e-mail.');
      return;
    }
    // formato simples de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrim)) {
      e.preventDefault();
      setError('Formato de e-mail inválido.');
      return;
    }

    if (!password || !String(password).trim()) {
      e.preventDefault();
      setError('Por favor, informe sua senha.');
      return;
    }

    // Limpar erros e mostrar spinner imediatamente
    setError('');
    startTransition(() => {
      setLoading(true);
    });

    // Não previnir o submit: o form será enviado para a Server Action `login`
    // O servidor fará a autenticação e retornará o redirect correto.
    // Se o servidor redirecionar de volta para /login com ?message=...,
    // o useEffect abaixo mostrará o toast apropriado.
  };

  const handleGoogleLogin = async () => {
    if (loading || isPending || googleLoading) return;
    setGoogleLoading(true);
    setError('');
    try {
      await loginWithGoogle();
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : String(e ?? 'Erro ao autenticar com Google');
      toast.error(message);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full overflow-hidden font-sans bg-[#0d1b2c]">
      <style>{`
        @keyframes rvOverlayFade {
          0% { opacity: 0 }
          100% { opacity: 1 }
        }
        @keyframes rvInnerPop {
          0% { opacity: 0; transform: translateY(-6px) scale(.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      {/* ESQUERDA: Onboarding */}
      <div className="hidden flex-1 lg:block animate-fade-in relative">
        <div className="absolute inset-0 bg-[#0d1b2c]/50 z-0 pointer-events-none"></div>
        <LoginOnboarding />
      </div>

      {/* DIREITA: Formulário */}
      <div className="flex flex-1 items-center justify-center p-4 lg:p-12 bg-gray-50">
        <div className="w-full max-w-[440px] animate-fade-up">
          <div className="relative rounded-2xl bg-white p-8 shadow-2xl ring-1 ring-gray-200 sm:p-10">
            {(loading || isPending) && (
              <div
                className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl pointer-events-auto"
                style={{
                  animation: 'rvOverlayFade 260ms ease-out both',
                  backgroundColor: 'rgba(0,0,0,0.28)',
                  backdropFilter: 'blur(6px)',
                }}
              >
                <div
                  style={{
                    animation: 'rvInnerPop 260ms cubic-bezier(.2,.9,.2,1) both',
                  }}
                  className="bg-white/95 px-4 py-3 rounded-md flex items-center gap-3 shadow-lg"
                >
                  <Loader2 className="h-5 w-5 animate-spin text-gray-700" />
                  <span className="text-sm text-gray-800">Entrando...</span>
                </div>
              </div>
            )}
            {/* Logo */}
            <div className="mb-8 text-center">
              <Logo useSystemLogo={true} className="h-16 mx-auto mb-6" />
              <h2 className="text-2xl font-bold tracking-tight text-[#0d1b2c]">
                Bem-vindo de volta
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Aceda ao seu catálogo e pedidos
              </p>
            </div>

            {/* --- BOTÃO GOOGLE --- */}
            <div className="mb-6">
              <Button
                type="button"
                variant="google"
                onClick={handleGoogleLogin}
                loading={googleLoading}
                disabled={loading || isPending}
              >
                {!googleLoading && (
                  <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                Continuar com Google
              </Button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">
                  Ou com email
                </span>
              </div>
            </div>

            {/* FORMULÁRIO EMAIL (enviado para Server Action `login`) */}
            <form action={login} onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <span className="mr-2">⚠️</span> {error}
                </div>
              )}

              {/* success messages shown via toast after server redirect */}

              <div>
                <label className="mb-1.5 block text-sm font-bold text-[#0d1b2c]">
                  Email
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading || isPending}
                    className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-gray-900 focus:border-[#b9722e] focus:ring-2 focus:ring-[#b9722e] focus:ring-offset-1 transition-all outline-none"
                    autoComplete="email"
                    placeholder="nome@empresa.com"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-bold text-[#0d1b2c]">
                    Senha
                  </label>
                  <button
                    type="button"
                    disabled={loading || isPending}
                    className="text-sm font-medium text-[#b9722e] hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Esqueceu?
                  </button>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading || isPending}
                    className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-gray-900 focus:border-[#b9722e] focus:ring-2 focus:ring-[#b9722e] focus:ring-offset-1 transition-all outline-none"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                loading={loading || isPending}
                variant="primary"
              >
                Acessar Sistema <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-xs text-gray-400">© 2025 Rep Vendas.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
