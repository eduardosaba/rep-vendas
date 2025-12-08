'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  UploadCloud,
  RefreshCcw,
  Download,
  Link as LinkIcon,
  PlusCircle,
  Tag,
  List,
  HelpCircle,
  Settings as SettingsIcon,
  DollarSign,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { logger } from '@/lib/logger';
import Logo from './Logo';
import { supabase } from '@/lib/supabaseClient';
import type { Settings } from '@/lib/types';

export function Sidebar({
  settings: initialSettings,
}: { settings?: Settings | null } = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const [branding, setBranding] = useState<Settings | null>(
    initialSettings || null
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storage = (
        globalThis as unknown as {
          localStorage?: {
            getItem(key: string): string | null;
            setItem(key: string, value: string): void;
          };
        }
      ).localStorage;
      const raw = storage?.getItem('sidebarCollapsed');
      if (raw !== null && raw !== undefined) setIsCollapsed(raw === 'true');
    } catch {
      // ignore (SSR or privacy settings)
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storage = (
        globalThis as unknown as {
          localStorage?: {
            getItem(key: string): string | null;
            setItem(key: string, value: string): void;
          };
        }
      ).localStorage;
      storage?.setItem('sidebarCollapsed', String(isCollapsed));
    } catch {
      // ignore
    }
  }, [isCollapsed]);

  type MenuChild = {
    title: string;
    href: string;
    icon: React.ComponentType<Record<string, unknown>>;
  };
  type MenuItem = {
    icon: React.ComponentType<Record<string, unknown>>;
    label: string;
    href: string;
    children?: MenuChild[];
  };

  const menuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: 'Visão Geral', href: '/dashboard' },
    { icon: ShoppingBag, label: 'Pedidos', href: '/dashboard/orders' },
    {
      icon: Package,
      label: 'Produtos',
      href: '/dashboard/products',
      children: [
        {
          title: 'Novo Produto manual',
          href: '/dashboard/products/new',
          icon: PlusCircle,
        },
        {
          title: '1ª Etapa: Import Visual',
          href: '/dashboard/products/import-visual',
          icon: UploadCloud,
        },
        {
          title: '2ª Etapa: Import Dados',
          href: '/dashboard/products/import-massa',
          icon: RefreshCcw,
        },
        {
          title: '3ª Etapa: Matcher',
          href: '/dashboard/products/matcher',
          icon: LinkIcon,
        },
        {
          title: 'Gerenciar Imagens Externas',
          href: '/dashboard/manage-external-images',
          icon: Download,
        },
        {
          title: 'Marcas',
          href: '/dashboard/brands',
          icon: Tag,
        },
        {
          title: 'Categorias',
          href: '/dashboard/categories',
          icon: List,
        },
        {
          title: 'Atualização de Preços',
          href: '/dashboard/products/update-prices',
          icon: DollarSign,
        },
      ],
    },
    { icon: Users, label: 'Clientes', href: '/dashboard/clients' },
    { icon: HelpCircle, label: 'Central de Ajuda', href: '/dashboard/help' },
    { icon: SettingsIcon, label: 'Configurações', href: '/dashboard/settings' },
  ];

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      logger.error('Logout error', err);
    } finally {
      router.push('/login');
    }
  };

  const toggle = () => setIsCollapsed((v) => !v);

  // Carregar perfil (role) e settings apenas se não vierem por prop
  useEffect(() => {
    const loadData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role === 'master') setIsMaster(true);

        // settings apenas se não vieram via prop
        if (!initialSettings) {
          const { data: settings } = await supabase
            .from('settings')
            .select('logo_url, primary_color, name')
            .eq('user_id', user.id)
            .single();

          if (settings) {
            setBranding({
              logo_url: settings.logo_url,
              primary_color: settings.primary_color || '#4f46e5',
              name: settings.name || 'RepVendas',
            } as Settings);
          }
        }
      } catch (err) {
        logger.error('Sidebar loadData error', err);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <aside
      aria-label="Menu lateral"
      className={`relative flex flex-col border-r bg-white transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      } min-h-screen`}
    >
      <button
        aria-pressed={isCollapsed}
        aria-label={isCollapsed ? 'Expandir menu' : 'Colapsar menu'}
        onClick={toggle}
        className="absolute -right-3 top-8 flex h-6 w-6 items-center justify-center rounded-full border bg-white shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="flex h-16 items-center justify-center border-b px-6">
        {isCollapsed ? (
          <div className="flex items-center justify-center">
            <Logo
              settings={branding}
              useSystemLogo={!branding?.logo_url}
              className="h-8 w-auto"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <Logo
              settings={branding}
              showText
              useSystemLogo={!branding?.logo_url}
              className="h-10 w-auto"
            />
          </div>
        )}
      </div>

      <nav
        className="flex-1 space-y-1 p-4"
        role="navigation"
        aria-label="Links principais"
      >
        {menuItems.map((item) => {
          const Icon = item.icon as React.ComponentType<{
            size?: number;
            className?: string;
          }>;
          const isActive = pathname?.startsWith(item.href) ?? false;

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 rv-text-primary'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
                title={isCollapsed ? item.label : ''}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  size={20}
                  className={isActive ? 'rv-text-primary' : 'text-gray-500'}
                />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>

              {/* Render submenu se existir */}
              {Array.isArray(item.children) && item.children.length > 0 && (
                <ul className="mt-1 ml-6 space-y-1">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon as React.ComponentType<{
                      size?: number;
                      className?: string;
                    }>;
                    const childActive =
                      pathname?.startsWith(child.href) ?? false;
                    return (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          className={`flex items-center gap-2 rounded-md px-3 py-1 text-sm transition-colors ${
                            childActive
                              ? 'bg-indigo-50 rv-text-primary font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                          title={isCollapsed ? child.title : ''}
                          aria-current={childActive ? 'page' : undefined}
                        >
                          <ChildIcon
                            size={16}
                            className={
                              childActive ? 'rv-text-primary' : 'text-gray-400'
                            }
                          />
                          {!isCollapsed && (
                            <span className="text-sm">{child.title}</span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <button
          onClick={handleLogout}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title="Sair"
          aria-label="Sair do sistema"
        >
          <LogOut size={20} />
          {!isCollapsed && <span>Sair do Sistema</span>}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
