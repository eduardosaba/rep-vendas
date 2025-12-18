'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  RefreshCcw,
  UploadCloud,
  Link as LinkIcon,
  PlusCircle,
  Tag,
  List,
  HelpCircle,
  Settings as SettingsIcon,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Edit,
  FileText,
  Circle,
  Box,
  Download,
} from 'lucide-react';
import Logo from './Logo';
import { createClient } from '@/lib/supabase/client';
import type { Settings } from '@/lib/types';

// Itens do Menu (Mantidos como no seu original)
const MENU_ITEMS = [
  {
    icon: LayoutDashboard,
    label: 'Visão Geral',
    href: '/dashboard',
    exact: true,
  },
  { icon: ShoppingBag, label: 'Pedidos', href: '/dashboard/orders' },
  {
    icon: Package,
    label: 'Produtos',
    href: '/dashboard/products',
    children: [
      {
        title: 'Lista de Produtos',
        href: '/dashboard/products',
        icon: List,
        exact: true,
      },
      {
        title: 'Novo Produto',
        href: '/dashboard/products/new',
        icon: PlusCircle,
      },
      {
        title: 'Tabela de Produtos',
        href: '/dashboard/products/bulk-edit',
        icon: Edit,
      },
      { title: 'Categorias', href: '/dashboard/categories', icon: Box },
      { title: 'Marcas', href: '/dashboard/brands', icon: Tag },
    ],
  },
  {
    icon: FileText,
    label: 'Ferramentas',
    href: '#tools',
    children: [
      {
        title: 'Importar Excel',
        href: '/dashboard/products/import-massa',
        icon: RefreshCcw,
      },
      {
        title: 'Importar Fotos',
        href: '/dashboard/products/import-visual',
        icon: UploadCloud,
      },
      {
        title: 'Vincular (Matcher)',
        href: '/dashboard/products/matcher',
        icon: LinkIcon,
      },
      {
        title: 'Atualizar Preços',
        href: '/dashboard/products/update-prices',
        icon: DollarSign,
      },
      {
        title: 'Imagens Externas',
        href: '/dashboard/manage-external-images',
        icon: Download,
      },
    ],
  },
  { icon: Users, label: 'Clientes', href: '/dashboard/clients' },
  { icon: SettingsIcon, label: 'Configurações', href: '/dashboard/settings' },
  { icon: HelpCircle, label: 'Ajuda', href: '/dashboard/help' },
];

export function Sidebar({
  settings: initialSettings,
  isMobile = false,
}: { settings?: Settings | null; isMobile?: boolean } = {}) {
  const pathname = usePathname();
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([
    'Produtos',
    'Ferramentas',
  ]);
  const [branding, setBranding] = useState<Settings | null>(
    initialSettings || null
  );

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('sidebarCollapsed');
    if (stored) setIsCollapsed(stored === 'true');
  }, []);

  useEffect(() => {
    if (mounted) localStorage.setItem('sidebarCollapsed', String(isCollapsed));
  }, [isCollapsed, mounted]);

  // Busca branding apenas para o Logo, pois as cores já estão no :root via ThemeRegistry
  useEffect(() => {
    if (mounted && !initialSettings) {
      const loadBranding = async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('settings')
            .select('logo_url, primary_color, name')
            .eq('user_id', user.id)
            .maybeSingle();
          if (data) setBranding(data as Settings);
        }
      };
      loadBranding();
    }
  }, [mounted, initialSettings, supabase]);

  if (!mounted || !pathname?.startsWith('/dashboard')) return null;

  const toggleSubmenu = (label: string) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setExpandedMenus([label]);
    } else {
      setExpandedMenus((prev) =>
        prev.includes(label)
          ? prev.filter((i) => i !== label)
          : [...prev, label]
      );
    }
  };

  return (
    <aside
      className={`
        ${isMobile ? 'fixed inset-y-0 left-0 z-50' : 'relative flex flex-col border-r dark:border-slate-800 h-full z-30'} 
        bg-white dark:bg-slate-950 transition-all duration-300 
        ${isCollapsed ? 'w-20' : 'w-72'}
      `}
    >
      {/* Botão de Recolher (Desktop) */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden md:flex absolute -right-3 top-6 h-7 w-7 items-center justify-center rounded-full border bg-white dark:bg-slate-900 shadow-md text-gray-500 hover:text-primary transition-colors z-50"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Header da Sidebar / Logo */}
      <div
        className={`flex h-20 items-center px-6 border-b border-gray-50 dark:border-slate-800/50 ${isCollapsed ? 'justify-center px-0' : ''}`}
      >
        <Logo
          settings={branding}
          showText={!isCollapsed}
          className="h-8 w-auto"
        />
      </div>

      {/* Navegação */}
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto scrollbar-none">
        {MENU_ITEMS.map((item) => {
          const label = item.label || '';
          const hasChildren = !!item.children?.length;
          const expanded = expandedMenus.includes(label);
          const active = hasChildren
            ? item.children?.some((child) => pathname === child.href)
            : item.exact
              ? pathname === item.href
              : pathname?.startsWith(item.href);

          const Icon = item.icon || Circle;

          return (
            <div key={label} className="mb-1">
              <Link
                href={hasChildren ? '#' : item.href}
                onClick={(e) => {
                  if (hasChildren) {
                    e.preventDefault();
                    toggleSubmenu(label);
                  }
                }}
                className={`
                  group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all
                  ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-slate-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-900'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={20}
                    className={
                      active
                        ? 'text-primary-foreground'
                        : 'text-slate-400 group-hover:text-primary'
                    }
                  />
                  {!isCollapsed && <span>{label}</span>}
                </div>
                {hasChildren && !isCollapsed && (
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
                  />
                )}
              </Link>

              {/* Submenu */}
              {hasChildren && expanded && !isCollapsed && (
                <div className="mt-1 ml-6 space-y-1 border-l-2 border-gray-100 dark:border-slate-800 pl-2 animate-in slide-in-from-left-2 duration-200">
                  {item.children?.map((child) => {
                    const childActive = child.exact
                      ? pathname === child.href
                      : pathname?.startsWith(child.href);
                    const ChildIcon = child.icon || Circle;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`
                          flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors
                          ${
                            childActive
                              ? 'text-primary font-semibold bg-primary/5'
                              : 'text-slate-500 hover:text-primary hover:bg-gray-50 dark:hover:bg-slate-900'
                          }
                        `}
                      >
                        <ChildIcon size={16} />
                        <span>{child.title}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
