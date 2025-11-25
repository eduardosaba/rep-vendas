'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import LoginOnboarding from '@/components/LoginOnboarding';
import Logo from '@/components/Logo';

const Button = ({
  children,
  className = '',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex w-full items-center justify-center rounded-lg bg-[#b9722e] px-4 py-3 font-bold text-white shadow-lg transition-all hover:bg-[#9a5e24] focus:outline-none focus:ring-2 focus:ring-[#b9722e] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
    >
      {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : children}
    </button>
  );
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Verifica sessão existente e redireciona se já autenticado
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) router.replace('/dashboard');
    };
    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      const { data, error } = res as any;

      if (error) {
        const msg =
          (error?.message as string) || 'Ocorreu um erro ao autenticar.';
        if (msg.includes('Invalid login')) {
          setError('Email ou senha incorretos.');
        } else {
          setError(msg);
        }
        return;
      }

      // Se houver sessão, buscar role no profile e redirecionar apropriadamente
      if (data?.session && data?.user?.id) {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();

          // Log detalhado para depuração do 500 (PostgREST)
          if (profileError) {
            console.error('profile fetch error', profileError);
            // Não bloquear o fluxo por falta de profile; enviar ao dashboard
            router.push('/dashboard');
            return;
          }

          console.debug('profile fetch success', profileData);

          const role = profileData?.role;
          if (role === 'master') {
            router.push('/admin');
          } else {
            router.push('/dashboard');
          }
          return;
        } catch (err) {
          router.push('/dashboard');
          return;
        }
      }

      setError('Não foi possível efetuar o login.');
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao entrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full overflow-hidden font-sans bg-[#0d1b2c]">
      {/* ESQUERDA: Onboarding */}
      <div className="hidden flex-1 lg:block animate-fade-in relative">
        {/* Máscara para escurecer um pouco o fundo se necessário */}
        <div className="absolute inset-0 bg-[#0d1b2c]/50 z-0 pointer-events-none"></div>
        <LoginOnboarding />
      </div>

      {/* DIREITA: Formulário */}
      <div className="flex flex-1 items-center justify-center p-4 lg:p-12 bg-gray-50">
        <div className="w-full max-w-[440px] animate-fade-up">
          <div className="rounded-2xl bg-white p-8 shadow-2xl ring-1 ring-gray-200 sm:p-10">
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

            {/* modo dev removido */}

            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="flex items-center rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <span className="mr-2">⚠️</span> {error}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-bold text-[#0d1b2c]">
                  Email
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    onClick={() => {}}
                    className="text-sm font-medium text-[#b9722e] hover:underline"
                  >
                    Esqueceu?
                  </button>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

              <Button type="submit" loading={loading}>
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
