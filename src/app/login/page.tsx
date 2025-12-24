'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import LoginOnboarding from '@/components/LoginOnboarding';
import Logo from '@/components/Logo';
import { loginWithGoogle } from '@/app/login/actions';

// Componente de Botão estilizado
const LoginButton = ({
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
  type?: 'button' | 'submit';
  variant?: 'primary' | 'google';
}) => {
  const baseStyle =
    'flex w-full items-center justify-center rounded-xl px-4 py-3.5 font-bold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 active:scale-[0.98]';

  const variants = {
    primary:
      'bg-[#b9722e] text-white hover:bg-[#a06328] focus:ring-[#b9722e] shadow-orange-900/10',
    google:
      'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 focus:ring-gray-200 hover:border-gray-300',
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  // Processar mensagens vindas da URL
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const msgType = sp.get('message_type');
    const msgText = sp.get('message_text');
    const message = sp.get('message');

    if (msgType && msgText) {
      if (msgType === 'success') toast.success(msgText);
      else toast.error(msgText);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (message) {
      if (message.includes('realizado') || message.includes('Verifique')) {
        toast.success(message);
      } else {
        toast.error(message);
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending || googleLoading) return;

    const emailTrim = email.trim();
    if (!emailTrim || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setError('');

    startTransition(async () => {
      try {
        const resp = await fetch('/api/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: emailTrim, password }),
          credentials: 'include',
        });

        const result = await resp.json();

        if (!resp.ok) {
          setError(result?.text || 'Erro ao autenticar.');
          toast.error(result?.text || 'Erro ao autenticar.');
          return;
        }

        if (result?.redirect) {
          window.location.href = result.redirect;
        } else {
          // fallback
          window.location.href = '/dashboard';
        }
      } catch (err) {
        console.error('[login] client fetch /api/login failed', err);
        setError('Erro interno ao autenticar.');
        toast.error('Erro interno ao autenticar.');
      }
    });
  };

  const handleGoogleLogin = async () => {
    if (isPending || googleLoading) return;
    setGoogleLoading(true);
    setError('');
    try {
      const result = await loginWithGoogle();
      if (result.error) {
        toast.error(result.error);
        setGoogleLoading(false);
      } else if (result.url) {
        window.location.href = result.url;
      }
    } catch (e) {
      toast.error('Erro ao autenticar com Google');
      setGoogleLoading(false);
    }
  };

  const isLoading = isPending || googleLoading;

  return (
    <div className="flex min-h-screen w-full overflow-hidden font-sans bg-[#0d1b2c]">
      <div className="hidden flex-1 lg:block relative animate-in fade-in duration-700">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1b2c]/90 to-[#0d1b2c]/40 z-10 pointer-events-none"></div>
        <LoginOnboarding />
      </div>

      <div className="flex flex-1 items-center justify-center p-4 lg:p-12 bg-gray-50 dark:bg-[#0b1623] relative">
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#b9722e 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        ></div>

        <div className="w-full max-w-[440px] z-10 animate-in slide-in-from-bottom-8 duration-500 fade-in">
          <div className="bg-white rounded-3xl p-8 shadow-2xl ring-1 ring-gray-100 sm:p-12 relative overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-[#b9722e]" />
                  <span className="text-sm font-medium text-gray-600">
                    Autenticando...
                  </span>
                </div>
              </div>
            )}

            <div className="mb-10 text-center">
              <div className="flex justify-center mb-6">
                <Logo useSystemLogo={true} className="h-14" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-[#0d1b2c]">
                Bem-vindo de volta
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Acesse seu painel para gerenciar suas vendas.
              </p>
            </div>

            <div className="mb-8">
              <LoginButton
                variant="google"
                onClick={handleGoogleLogin}
                loading={googleLoading}
                disabled={isLoading}
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
              </LoginButton>
            </div>

            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-400 font-medium tracking-wider">
                  Ou entre com email
                </span>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
              autoComplete="on"
            >
              {error && (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 animate-in slide-in-from-top-2">
                  <AlertCircle size={18} className="shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-gray-700 ml-1"
                >
                  Email
                </label>
                <div className="relative group">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-[#b9722e] transition-colors" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-3 text-gray-900 placeholder:text-gray-400 focus:border-[#b9722e] focus:bg-white focus:ring-2 focus:ring-[#b9722e]/20 transition-all outline-none"
                    placeholder="exemplo@empresa.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1">
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-gray-700"
                  >
                    Senha
                  </label>
                  <button
                    type="button"
                    disabled={isLoading}
                    className="text-xs font-medium text-[#b9722e] hover:text-[#a06328] hover:underline disabled:opacity-50"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative group">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-[#b9722e] transition-colors" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-11 text-gray-900 placeholder:text-gray-400 focus:border-[#b9722e] focus:bg-white focus:ring-2 focus:ring-[#b9722e]/20 transition-all outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <LoginButton
                  type="submit"
                  loading={isLoading}
                  disabled={isLoading}
                  variant="primary"
                >
                  Acessar Sistema <ArrowRight className="ml-2 h-4 w-4" />
                </LoginButton>
              </div>
            </form>

            <div className="mt-8 text-center border-t border-gray-100 pt-6">
              <p className="text-xs text-gray-400">
                Não tem uma conta?{' '}
                <a
                  href="#"
                  className="font-semibold text-[#b9722e] hover:underline"
                >
                  Cadastre-se
                </a>
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              © 2025 Rep Vendas. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
