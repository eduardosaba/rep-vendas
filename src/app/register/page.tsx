'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle,
  CheckCircle2,
  User,
} from 'lucide-react';
import LoginOnboarding from '@/components/LoginOnboarding';
import Logo from '@/components/Logo';
import { signup, loginWithGoogle } from '@/app/login/actions';

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

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const message = searchParams.get('message');
    if (message) {
      if (message.includes('realizado') || message.includes('Verifique')) {
        setSuccess(message);
      } else {
        setError(message);
      }
      setLoading(false);
      setGoogleLoading(false);
    }
  }, [searchParams]);

  const handleServerSignup = async (formData: FormData) => {
    setLoading(true);
    setError('');
    setSuccess('');

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      setLoading(false);
      return;
    }

    await signup(formData);
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    await loginWithGoogle();
  };

  return (
    <div className="flex min-h-screen w-full overflow-hidden font-sans bg-[#0d1b2c]">
      {/* ESQUERDA: Onboarding */}
      <div className="hidden flex-1 lg:block animate-fade-in relative">
        <div className="absolute inset-0 bg-[#0d1b2c]/50 z-0 pointer-events-none"></div>
        <LoginOnboarding />
      </div>

      {/* DIREITA: Formulário */}
      <div className="flex flex-1 items-center justify-center p-4 lg:p-12 bg-gray-50">
        <div className="w-full max-w-[440px] animate-fade-up">
          <div className="rounded-2xl bg-white p-8 shadow-2xl ring-1 ring-gray-200 sm:p-10">
            {/* Cabeçalho de Marketing (Trazido do seu código antigo) */}
            <div className="mb-6 text-center">
              <div className="mb-6 flex justify-center">
                <Logo useSystemLogo={true} className="h-14" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-[#0d1b2c]">
                Teste Grátis por 14 Dias
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Acesso completo à Torre de Controle e Catálogo. Sem cartão de
                crédito.
              </p>
            </div>

            {/* Lista de Benefícios (Trazido do seu código antigo) */}
            <div className="mb-6 bg-orange-50 rounded-lg p-4 border border-orange-100">
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center">
                  <CheckCircle2 className="text-[#b9722e] w-4 h-4 mr-2" />
                  Catálogo Ilimitado
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="text-[#b9722e] w-4 h-4 mr-2" />
                  Link Personalizado
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="text-[#b9722e] w-4 h-4 mr-2" />
                  Pedidos via WhatsApp
                </li>
              </ul>
            </div>

            {/* --- BOTÃO GOOGLE --- */}
            <div className="mb-6">
              <Button
                type="button"
                variant="google"
                onClick={handleGoogleLogin}
                loading={googleLoading}
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
                Cadastrar com Google
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

            {/* FORMULÁRIO EMAIL */}
            <form action={handleServerSignup} className="space-y-5">
              {error && (
                <div className="flex items-center rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <span className="mr-2">⚠️</span> {error}
                </div>
              )}

              {success && (
                <div className="flex items-center rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                  <CheckCircle size={18} className="mr-2" /> {success}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-bold text-[#0d1b2c]">
                  Email Profissional
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
                    className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-gray-900 focus:border-[#b9722e] focus:ring-2 focus:ring-[#b9722e] focus:ring-offset-1 transition-all outline-none"
                    autoComplete="email"
                    placeholder="voce@empresa.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-[#0d1b2c]">
                  Criar Senha
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-gray-900 focus:border-[#b9722e] focus:ring-2 focus:ring-[#b9722e] focus:ring-offset-1 transition-all outline-none"
                    autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres"
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

              <Button type="submit" loading={loading} variant="primary">
                Criar Conta Gratuita <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <div className="mt-8 text-center text-sm">
              <p className="text-gray-500">
                Já tem uma conta?{' '}
                <Link
                  href="/login"
                  className="font-semibold text-[#b9722e] hover:text-[#9a5e24] hover:underline"
                >
                  Fazer Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
