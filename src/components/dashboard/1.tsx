'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  Settings,
  LogOut,
  BarChart3,
  Store,
  Tag,
  Layers,
  ShieldAlert,
  CreditCard,
  Activity,
  Terminal,
} from 'lucide-react';
import Logo from '@/components/Logo';
import { createClient } from '@/lib/supabase/client';

// --- MENU DO VENDEDOR (Padrão) ---
const userMenuItems = [
  { title: 'Visão Geral', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Pedidos', href: '/dashboard/orders', icon: ShoppingCart },
  { title: 'Produtos', href: '/dashboard/products', icon: Package },
  { title: 'Marcas', href: '/dashboard/brands', icon: Tag },
  { title: 'Categorias', href: '/dashboard/categories', icon: Layers },
  { title: 'Clientes', href: '/dashboard/clients', icon: Users },
  { title: 'Relatórios', href: '/dashboard/reports', icon: BarChart3 },
  { title: 'Configurações', href: '/dashboard/settings', icon: Settings },
];

// --- MENU DO MASTER (Admin) ---
const adminMenuItems = [
  { title: 'Master Visão', href: '/admin', icon: Activity },
  { title: 'Todos Usuários', href: '/admin/users', icon: Users },
  { title: 'Licenças', href: '/admin/licenses', icon: CreditCard },
  { title: 'System Debug', href: '/admin/debug', icon: Terminal },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMaster, setIsMaster] = useState(false);

  // Estado de Branding
  const [branding, setBranding] = useState({
    logo_url: null as string | null,
    primary_color: '#4f46e5', // Default Indigo-600
    store_name: 'RepVendas',
  });

  const supabase = useMemo(() => createClient(), []);

  // Carregar Perfil e Configurações
  useEffect(() => {
    const loadData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // 1. Verifica Role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role === 'master') {
          setIsMaster(true);
        }

        // 2. Verifica Branding (com resiliência .maybeSingle())
        const { data: settings } = await supabase
          .from('settings')
          .select('logo_url, primary_color, name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (settings) {
          setBranding({
            logo_url: settings.logo_url,
            primary_color: settings.primary_color || '#4f46e5',
            store_name: settings.name || 'RepVendas',
          });
        }
      }
    };
    loadData();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  // Helper para cor de fundo com opacidade (simulação do bg-indigo-50)
  const getActiveStyle = (isActive: boolean) => {
    if (!isActive) return {};
    // Usa a cor primária com baixa opacidade para o fundo, e cor sólida para texto
    return {
      backgroundColor: `${branding.primary_color}15`, // ~10% opacidade
      color: branding.primary_color,
    };
  };

  return (
    <aside className="hidden h-screen w-64 flex-col border-r border-gray-200 bg-white md:flex transition-colors duration-300">
      <div className="flex h-20 items-center border-b border-gray-200 px-6">
        {/* Sempre usar o logo do sistema no sidebar (solicitação) */}
        <Logo useSystemLogo className="h-12 w-auto" />
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar">
        {/* --- SEÇÃO VENDEDOR --- */}
        <ul className="space-y-1 mb-6">
          {userMenuItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  style={getActiveStyle(isActive)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    !isActive
                      ? 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      : ''
                  }`}
                >
                  <Icon
                    className="h-5 w-5"
                    style={{
                      color: isActive ? branding.primary_color : undefined,
                    }}
                  />
                  {item.title}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* --- SEÇÃO MASTER (Condicional) --- */}
        {isMaster && (
          <>
            <div className="px-3 mb-2 mt-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <ShieldAlert size={12} /> Torre de Controle
              </p>
            </div>
            <ul className="space-y-1 mb-6 p-2 bg-gray-50 rounded-xl border border-gray-100">
              {adminMenuItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-gray-900 text-white shadow-md'
                          : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                      }`}
                    >
                      <Icon size={16} />
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </nav>

      <div className="border-t border-gray-200 p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <LogOut className="h-5 w-5" />
          Sair do Sistema
        </button>
      </div>
    </aside>
  );
}
