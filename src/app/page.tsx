'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Users, BarChart3, ArrowRight } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);

      // Se usuário estiver logado, redirecionar para seu catálogo
      if (user) {
        router.push(`/catalog/${user.id}`);
      }
    };
    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se usuário estiver logado, já foi redirecionado
  if (user) {
    return null;
  }

  // Página de boas-vindas para usuários não logados
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <ShoppingBag className="mr-3 h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Rep-Vendas</h1>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/login')}
                className="font-medium text-gray-600 hover:text-gray-900"
              >
                Entrar
              </button>
              <button
                onClick={() => router.push('/register')}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                Começar Agora
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="mb-6 text-4xl font-bold text-gray-900 md:text-6xl">
            Sistema de Vendas para
            <br />
            <span className="text-blue-600">Representantes Comerciais</span>
          </h1>
          <p className="mx-auto mb-8 max-w-3xl text-xl text-gray-600">
            Crie seu catálogo online personalizado, gerencie pedidos e clientes
            de forma eficiente. Cada representante tem seu próprio link único
            para compartilhar com clientes.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <button
              onClick={() => router.push('/register')}
              className="flex items-center justify-center rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Criar Minha Conta
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
            <button
              onClick={() => router.push('/login')}
              className="rounded-lg border-2 border-blue-600 px-8 py-4 text-lg font-semibold text-blue-600 transition-colors hover:bg-blue-50"
            >
              Já tenho conta
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="rounded-xl bg-white p-8 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <ShoppingBag className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="mb-4 text-xl font-semibold text-gray-900">
              Catálogo Personalizado
            </h3>
            <p className="text-gray-600">
              Crie seu próprio catálogo online com produtos, preços e
              configurações personalizadas. Cada representante tem seu link
              único.
            </p>
          </div>

          <div className="rounded-xl bg-white p-8 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Users className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="mb-4 text-xl font-semibold text-gray-900">
              Gestão de Clientes
            </h3>
            <p className="text-gray-600">
              Gerencie seus clientes, histórico de pedidos e informações de
              contato. Mantenha relacionamentos organizados.
            </p>
          </div>

          <div className="rounded-xl bg-white p-8 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="mb-4 text-xl font-semibold text-gray-900">
              Relatórios e Analytics
            </h3>
            <p className="text-gray-600">
              Acompanhe suas vendas, pedidos pendentes e performance com
              dashboards intuitivos e relatórios detalhados.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-20 rounded-2xl bg-white p-8 shadow-xl md:p-12">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              Como Funciona
            </h2>
            <p className="text-gray-600">
              Comece a vender online em poucos passos
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                1
              </div>
              <h3 className="mb-2 font-semibold text-gray-900">Cadastre-se</h3>
              <p className="text-sm text-gray-600">
                Crie sua conta de representante
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                2
              </div>
              <h3 className="mb-2 font-semibold text-gray-900">
                Configure seu Catálogo
              </h3>
              <p className="text-sm text-gray-600">
                Adicione produtos e personalize
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                3
              </div>
              <h3 className="mb-2 font-semibold text-gray-900">
                Compartilhe seu Link
              </h3>
              <p className="text-sm text-gray-600">
                Envie seu link único para clientes
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                4
              </div>
              <h3 className="mb-2 font-semibold text-gray-900">
                Gerencie Pedidos
              </h3>
              <p className="text-sm text-gray-600">
                Acompanhe vendas e clientes
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 bg-gray-900 py-12 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-4 flex items-center justify-center">
              <ShoppingBag className="mr-2 h-6 w-6 text-blue-400" />
              <span className="text-xl font-bold">Rep-Vendas</span>
            </div>
            <p className="mb-4 text-gray-400">
              Sistema completo para representantes comerciais gerenciarem seus
              catálogos e pedidos online.
            </p>
            <p className="text-sm text-gray-500">
              © 2025 Rep-Vendas. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
