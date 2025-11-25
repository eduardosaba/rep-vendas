'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import LoginOnboarding from '@/components/LoginOnboarding';

// Componente de Botão Local
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
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled || loading}
    className={`flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-3 font-medium text-white shadow-lg transition-all hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
  >
    {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : children}
  </button>
);

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          // Com 'Confirm email' desligado no painel do Supabase,
          // o login é automático e retorna a sessão imediatamente.
        },
      });

      if (authError) throw authError;

      // 2. Atualizar o nome no perfil público (redundância de segurança)
      if (authData.user) {
        await supabase
          .from('profiles')
          .update({ full_name: fullName })
          .eq('id', authData.user.id);
      }

      // 3. Redirecionar para o Dashboard
      // (O middleware irá detetar que o onboarding_completed é false e redirecionará para /onboarding)
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full overflow-hidden font-sans bg-gray-50">
      {/* LADO ESQUERDO: Onboarding Visual (Reutilizado do Login) */}
      <div className="hidden flex-1 lg:block animate-fade-in">
        <LoginOnboarding />
      </div>

      {/* LADO DIREITO: Formulário de Cadastro */}
      <div className="flex flex-1 items-center justify-center p-4 lg:p-12">
        <div className="w-full max-w-[440px] animate-fade-up">
          <div className="rounded-2xl bg-white p-8 shadow-2xl ring-1 ring-gray-100 sm:p-10">
            <button
              onClick={() => router.push('/login')}
              className="mb-6 flex items-center text-sm text-gray-500 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft size={16} className="mr-1" /> Já tenho conta
            </button>

            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
                <User className="h-8 w-8 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                Teste Grátis por 14 Dias
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Acesso completo à Torre de Controle e Catálogo. Sem cartão de
                crédito necessário.
              </p>
            </div>

            {/* Lista de Benefícios do Trial */}
            <div className="mb-6 bg-indigo-50/50 rounded-lg p-4 border border-indigo-100">
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <CheckCircle2 className="text-green-500 w-4 h-4 mr-2" />{' '}
                  Catálogo Ilimitado
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="text-green-500 w-4 h-4 mr-2" /> Link
                  Personalizado
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="text-green-500 w-4 h-4 mr-2" />{' '}
                  Pedidos via WhatsApp
                </li>
              </ul>
            </div>

            <form onSubmit={handleRegister} className="space-y-5">
              {error && (
                <div className="flex items-center rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 animate-shake">
                  <span className="mr-2">⚠️</span> {error}
                </div>
              )}

              {/* Campo Nome */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Nome Completo
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 transition-all outline-none"
                    placeholder="Seu nome"
                    required
                  />
                </div>
              </div>

              {/* Campo Email */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Email Profissional
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 transition-all outline-none"
                    placeholder="nome@empresa.com"
                    required
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Senha
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 transition-all outline-none"
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <Button type="submit" loading={loading}>
                Iniciar Teste Grátis <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <p className="text-xs text-center text-gray-500 mt-4">
                Ao criar uma conta, você concorda com nossos Termos de Serviço.
                Após os 14 dias, você poderá escolher um plano para continuar.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
