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
} from 'lucide-react';
import LoginOnboarding from '@/components/LoginOnboarding';
import Logo from '@/components/Logo';
import { login, loginWithGoogle } from './actions';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const result = await loginWithGoogle();
    if (result?.url) {
      // Try popup first to keep user on the page. If popup is blocked, fall back to full redirect.
      const popup = window.open(
        result.url,
        'supabase_oauth',
        'width=600,height=700,menubar=no,toolbar=no'
      );
      if (!popup) {
        // popup blocked -> redirect
        window.location.href = result.url;
      }
    } else {
      toast.error(result?.error || 'Erro no Google');
      setGoogleLoading(false);
    }
  };

  // Listener para receber mensagem do popup de autorização
  useEffect(() => {
    const handleMessage = async (e: MessageEvent) => {
      try {
        if (!e?.data || e.data.type !== 'supabase.auth.callback') return;
        const hash = String(e.data.hash || '');
        if (!hash) return;

        const params = new URLSearchParams(hash.replace(/^#/, ''));
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');

        const supabase = createClient();
        if (access_token) {
          // Prefer setSession when available
          if (
            supabase.auth &&
            typeof (supabase.auth as any).setSession === 'function'
          ) {
            await (supabase.auth as any).setSession({
              access_token,
              refresh_token,
            });
          }
          window.location.reload();
        }
      } catch (err) {
        console.error('Erro ao processar mensagem de auth:', err);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Caso o fluxo use redirect (hash presente no carregamento), tente consumir a sessão
  useEffect(() => {
    (async () => {
      try {
        const hash = window.location.hash || '';
        if (!hash) return;
        const params = new URLSearchParams(hash.replace(/^#/, ''));
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (!access_token) return;
        const supabase = createClient();
        if (
          supabase.auth &&
          typeof (supabase.auth as any).setSession === 'function'
        ) {
          await (supabase.auth as any).setSession({
            access_token,
            refresh_token,
          });
          // limpar hash para evitar reprocessing
          history.replaceState(
            null,
            '',
            window.location.pathname + window.location.search
          );
          window.location.reload();
        }
      } catch (err) {
        console.error('Erro ao processar redirect OAuth:', err);
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    const formData = new FormData(e.currentTarget);
    const result = await login(null, formData);

    if (result?.success) {
      toast.success('Entrando no sistema...');
      window.location.href = result.redirectTo;
    } else {
      setFormError(result?.error || 'Falha na autenticação');
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
          <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 sm:p-12 relative overflow-hidden">
            {(isSubmitting || googleLoading) && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
                <Loader2 className="h-10 w-10 animate-spin text-[#b9722e] mb-4" />
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  Validando Acesso...
                </p>
              </div>
            )}

            <div className="mb-10 text-center">
              <Logo useSystemLogo className="h-12 mx-auto mb-4" />
              <h2 className="text-2xl font-black text-[#0d1b2c]">
                Bem-vindo de volta
              </h2>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-gray-100 bg-white py-3.5 font-bold text-gray-700 hover:bg-gray-50 transition-all"
            >
              {/* Imagem do Google (local) - evita falhas offline */}
              <img
                src="/images/google.svg"
                className="h-5 w-5"
                alt="Google"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    '/images/default-logo.png';
                }}
              />
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

            <form onSubmit={handleSubmit} className="space-y-5">
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
                    className="w-full rounded-2xl border-2 border-gray-50 bg-gray-50 py-4 pl-12 pr-4 outline-none focus:border-[#b9722e]/30 transition-all"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="w-full rounded-2xl border-2 border-gray-50 bg-gray-50 py-4 pl-12 pr-12 outline-none focus:border-[#b9722e]/30 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
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
          </div>
        </div>
      </div>
    </div>
  );
}
