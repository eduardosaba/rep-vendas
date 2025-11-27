import { Sidebar } from '@/components/Sidebar';
import NotificationDropdown from '@/components/NotificationDropdown';
import { cookies } from 'next/headers';
import { createServerSupabase } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Criar cliente Supabase no Servidor
  const supabase = await createServerSupabase();

  // Verificar usuário autenticado usando getUser() (mais seguro no servidor)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Segurança extra: Se não houver usuário autenticado, redireciona para login
  if (!user) {
    redirect('/login');
  }
  const userName =
    (user as any)?.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    'Utilizador';
  const userInitial = userName[0].toUpperCase();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Menu Lateral Fixo */}
      <Sidebar />

      {/* Área Principal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Barra de Topo (Header) */}
        <header className="flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">
            Painel de Controle
          </h2>

          <div className="flex items-center gap-4">
            {/* Notificações (Agora conectado com o ID real) */}
            <NotificationDropdown userId={user.id} />

            {/* Perfil do Utilizador */}
            <div className="flex items-center gap-3 border-l pl-4">
              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                {userInitial}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-700">{userName}</p>
                <p className="text-xs text-gray-500">Representante</p>
              </div>
            </div>
          </div>
        </header>

        {/* Conteúdo da Página */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
