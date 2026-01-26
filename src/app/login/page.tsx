'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import LoginOnboarding from '@/components/LoginOnboarding';
import Logo from '@/components/Logo';
import { login, loginWithGoogle } from './actions';
import { createClient } from '@/lib/supabase/client';

type ViewState = 'login' | 'forgot_password';

export default function LoginPage() {
  const supabase = createClient();
  const [view, setView] = useState<ViewState>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  // Lógica de Recuperação de Senha
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/settings/password`,
    });

    if (error) {
      setFormError(error.message);
      setIsSubmitting(false);
    } else {
      toast.success('Link de recuperação enviado para o seu e-mail!');
      setView('login');
      setIsSubmitting(false);
    }
  };

  const isNextRedirect = (err: unknown) => {
    try {
      if (!err || typeof err !== 'object') return false;
      const d = (err as any).digest || (err as any).message;
      return typeof d === 'string' && d.startsWith('NEXT_REDIRECT');
    } catch {
      return false;
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const result = await loginWithGoogle();
    if (result?.url) {
      const popup = window.open(
        result.url,
        'supabase_oauth',
        'width=600,height=700,menubar=no,toolbar=no'
      );
      if (!popup) window.location.href = result.url;
    } else {
      toast.error(result?.error || 'Erro no Google');
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await login(null, formData);

      if (result?.success) {
        toast.success('Entrando no sistema...');
        window.location.href = result.redirectTo;
        return;
      }
      setFormError(result?.error || 'Falha na autenticação');
    } catch (err) {
      setFormError('Erro ao processar login');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full overflow-hidden font-sans bg-[#0d1b2c]">
      <div className="hidden flex-1 lg:block relative">
        <LoginOnboarding />
      </div>

      <div className="flex flex-1 items-center justify-center p-4 lg:p-12 bg-gray-50 dark:bg-[#0b1623] relative">
        <div className="w-full max-w-[440px] z-10">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 sm:p-12 relative overflow-hidden transition-all">
            {/* LOADER OVERLAY */}
            {(isSubmitting || googleLoading) && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
                <Loader2 className="h-10 w-10 animate-spin text-[#b9722e] mb-4" />
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  Aguarde...
                </p>
              </div>
            )}

            <div className="mb-10 text-center">
              <Logo useSystemLogo className="h-12 mx-auto mb-4" />
              <h2 className="text-2xl font-black text-[#0d1b2c]">
                {view === 'login' ? 'Bem-vindo de volta' : 'Recuperar Senha'}
              </h2>
              <p className="text-gray-400 text-xs mt-2 font-medium">
                {view === 'login'
                  ? 'Acesse sua conta para gerenciar suas vendas.'
                  : 'Informe seu e-mail para receber as instruções de recuperação.'}
              </p>
            </div>

            {view === 'login' ? (
              <>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-gray-100 bg-white py-3.5 font-bold text-gray-700 hover:bg-gray-50 transition-all"
                >
                  <span className="h-5 w-5 block" aria-hidden>
                    <svg
                      viewBox="0 0 32 32"
                      className="h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <defs>
                        <path
                          id="A"
                          d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"
                        />
                      </defs>
                      <clipPath id="B">
                        <use xlinkHref="#A" />
                      </clipPath>
                      <g transform="matrix(.727273 0 0 .727273 -.954545 -1.45455)">
                        <path
                          d="M0 37V11l17 13z"
                          clipPath="url(#B)"
                          fill="#fbbc05"
                        />
                        <path
                          d="M0 11l17 13 7-6.1L48 14V0H0z"
                          clipPath="url(#B)"
                          fill="#ea4335"
                        />
                        <path
                          d="M0 37l30-23 7.9 1L48 0v48H0z"
                          clipPath="url(#B)"
                          fill="#34a853"
                        />
                        <path
                          d="M48 48L17 24l-4-3 35-10z"
                          clipPath="url(#B)"
                          fill="#4285f4"
                        />
                      </g>
                    </svg>
                  </span>
                  Continuar com Google
                </button>

                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                    <span className="bg-white px-4 text-gray-300">
                      Ou use sua conta
                    </span>
                  </div>
                </div>

                <form
                  method="post"
                  action="#"
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >
                  {formError && (
                    <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-xs font-bold text-red-600">
                      <AlertCircle size={18} />
                      <p>{formError}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                      <input
                        name="email"
                        type="email"
                        required
                        autoComplete="username"
                        className="w-full rounded-2xl border-2 border-gray-50 bg-gray-50 py-4 pl-12 pr-4 outline-none focus:border-[#b9722e]/30 transition-all"
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Senha
                      </label>
                      <button
                        type="button"
                        onClick={() => setView('forgot_password')}
                        className="text-[10px] font-black text-[#b9722e] uppercase hover:underline"
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                      <input
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        className="w-full rounded-2xl border-2 border-gray-50 bg-gray-50 py-4 pl-12 pr-12 outline-none focus:border-[#b9722e]/30 transition-all"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300"
                      >
                        {showPassword ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center rounded-2xl bg-[#b9722e] py-4 font-black text-white hover:bg-[#a06328] transition-all shadow-xl shadow-[#b9722e]/20"
                  >
                    ACESSAR SISTEMA <ArrowRight className="ml-2 h-5 w-5" />
                  </button>
                </form>
              </>
            ) : (
              /* VIEW: RECUPERAÇÃO DE SENHA */
              <form
                method="post"
                action="#"
                onSubmit={handleForgotPassword}
                className="space-y-6"
              >
                {formError && (
                  <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-xs font-bold text-red-600">
                    <AlertCircle size={18} />
                    <p>{formError}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    E-mail para Recuperação
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="w-full rounded-2xl border-2 border-gray-50 bg-gray-50 py-4 pl-12 pr-4 outline-none focus:border-[#b9722e]/30 transition-all"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center rounded-2xl bg-[#0d1b2c] py-4 font-black text-white hover:bg-[#1a2d42] transition-all shadow-xl"
                >
                  ENVIAR LINK <ArrowRight className="ml-2 h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="w-full flex items-center justify-center gap-2 text-xs font-black text-gray-400 uppercase hover:text-[#b9722e] transition-colors"
                >
                  <ArrowLeft size={14} /> Voltar para o Login
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
