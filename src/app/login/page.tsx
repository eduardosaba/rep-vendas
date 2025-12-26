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
import { loginWithGoogle } from './actions';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // handled on submit via API

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result?.url) window.location.href = result.url;
    } catch {
      toast.error('Erro ao conectar com Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  const isLoading = isSubmitting || googleLoading;
  const effectiveLoading = isLoading || redirecting;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    try {
      const form = e.currentTarget as HTMLFormElement;
      const formData = new FormData(form);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Login realizado com sucesso!');
        setRedirecting(true);
        window.location.href = data.redirectTo;
      } else {
        setFormError(data.error || 'Erro ao autenticar');
        toast.error(data.error || 'Erro ao autenticar');
        setIsSubmitting(false);
      }
    } catch (err) {
      toast.error('Erro ao conectar com servidor');
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
          <div className="bg-white rounded-3xl p-8 shadow-2xl ring-1 ring-gray-100 sm:p-12 relative overflow-hidden">
            {effectiveLoading && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-[#b9722e]" />
              </div>
            )}
            <div className="mb-10 text-center">
              <Logo useSystemLogo className="h-14 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-[#0d1b2c]">
                Bem-vindo de volta
              </h2>
            </div>
            <button
              onClick={handleGoogleLogin}
              disabled={effectiveLoading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white py-3.5 font-bold text-gray-700 hover:bg-gray-50 transition-all"
            >
              Continuar com Google
            </button>
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-400">
                  Ou use seu email
                </span>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              {formError && (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <AlertCircle size={18} />
                  <p>{formError}</p>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 ml-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    name="email"
                    type="email"
                    required
                    className="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-3 focus:ring-2 focus:ring-[#b9722e]/20 outline-none"
                    placeholder="exemplo@empresa.com"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 ml-1">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-11 focus:ring-2 focus:ring-[#b9722e]/20 outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-gray-400"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={effectiveLoading}
                className="flex w-full items-center justify-center rounded-xl bg-[#b9722e] py-3.5 font-bold text-white hover:bg-[#a06328] transition-all disabled:opacity-70"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  'Acessar Sistema'
                )}
                {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
