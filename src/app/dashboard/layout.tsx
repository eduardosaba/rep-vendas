import React from 'react';
import Sidebar from '@/components/Sidebar';
import SessionGuard from '@/components/SessionGuard';
import { DashboardTopbar } from '@/components/dashboard/DashboardTopbar';
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

  // Buscar configurações/branding do usuário para aplicar tema e logo
  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  const primary = (settings && settings.primary_color) || '#4f46e5';
  // pequena função para escurecer uma cor hex sem dependências
  function darkenHex(hex: string, amount = 0.12) {
    try {
      const h = hex.replace('#', '');
      const r = Math.max(
        0,
        Math.min(
          255,
          Math.round(parseInt(h.substring(0, 2), 16) * (1 - amount))
        )
      );
      const g = Math.max(
        0,
        Math.min(
          255,
          Math.round(parseInt(h.substring(2, 4), 16) * (1 - amount))
        )
      );
      const b = Math.max(
        0,
        Math.min(
          255,
          Math.round(parseInt(h.substring(4, 6), 16) * (1 - amount))
        )
      );
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    } catch {
      return hex;
    }
  }

  const primaryHover = darkenHex(primary, 0.12);

  const cssVars = {
    ['--primary' as unknown as string]: primary,
    ['--primary-hover' as unknown as string]: primaryHover,
  } as React.CSSProperties;

  return (
    <div className="flex min-h-screen bg-gray-50" style={cssVars}>
      {/* Menu Lateral Fixo */}
      <Sidebar settings={settings ?? null} />

      {/* Área Principal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Barra de Topo (Header) - usar DashboardTopbar para garantir sino em todas as páginas */}
        <DashboardTopbar settings={settings ?? null} />

        {/* Conteúdo da Página */}
        <main className="flex-1 overflow-y-auto p-6">
          <SessionGuard />
          {children}
        </main>
      </div>
    </div>
  );
}
