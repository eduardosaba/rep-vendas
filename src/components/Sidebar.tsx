'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Edit,
  FileText,
  Circle,
  Box,
} from 'lucide-react';
import Logo from './Logo';
import { createClient } from '@/lib/supabase/client';
import type { Settings } from '@/lib/types';

interface MenuItem {
  icon?: React.ElementType;
  label?: string;
  title?: string;
  href: string;
  exact?: boolean;
  children?: MenuItem[];
}

const MENU_ITEMS: MenuItem[] = [
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
  // Helpers: get luminance and detect if a hex color is light
  const getLuminance = (hex?: string) => {
    if (!hex) return 0;
    const h = hex.replace('#', '').trim();
    const full =
      h.length === 3
        ? h
            .split('')
            .map((c) => c + c)
            .join('')
        : h;
    const r = parseInt(full.substring(0, 2), 16) / 255;
    const g = parseInt(full.substring(2, 4), 16) / 255;
    const b = parseInt(full.substring(4, 6), 16) / 255;
    const lin = (v: number) =>
      v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const isLightHex = (hex?: string) => getLuminance(hex) > 0.7;
  const pathname = usePathname();
  const isDashboardRoute = pathname?.startsWith('/dashboard');
  const supabase = createClient();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([
    'Produtos',
    'Ferramentas',
  ]);
  const [branding, setBranding] = useState<Settings | null>(
    initialSettings || null
  );

  useEffect(() => {
    setMounted(true);
    const storedState = localStorage.getItem('sidebarCollapsed');
    if (storedState) setIsCollapsed(storedState === 'true');
  }, []);

  useEffect(() => {
    if (mounted) localStorage.setItem('sidebarCollapsed', String(isCollapsed));
  }, [isCollapsed, mounted]);

  useEffect(() => {
    if (initialSettings) setBranding(initialSettings);
  }, [initialSettings]);

  // Se não vier via props, busca no client (fallback)
  useEffect(() => {
    if (mounted && !initialSettings) {
      const loadData = async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('settings')
          .select('logo_url, primary_color, name')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data) setBranding(data as Settings);
      };
      loadData();
    }
  }, [mounted, initialSettings, supabase]);

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

  const isItemActive = (item: MenuItem) => {
    if (item.exact) return pathname === item.href;
    if (item.children)
      return item.children.some((child) => pathname?.startsWith(child.href));
    return pathname?.startsWith(item.href);
  };

  const primary = branding?.primary_color || '#2563eb';
  const primaryForeground = isLightHex(primary) ? '#0f172a' : '#ffffff';
  const secondaryRaw = branding?.secondary_color || '#f8fafc';
  // If secondary is almost white, use a slightly darker fallback so it's visible
  const secondary =
    getLuminance(secondaryRaw) > 0.96 ? '#f3f4f6' : secondaryRaw;

  if (!mounted) return null;

  // Only render the sidebar inside dashboard routes
  if (!isDashboardRoute) return null;

  return (
    <aside
      style={{
        ['--primary' as any]: primary,
        ['--primary-foreground' as any]: primaryForeground,
        ['--secondary' as any]: secondary,
      }}
      className={`${isMobile ? 'fixed inset-y-0 left-0 z-50' : 'relative flex flex-col border-r dark:border-slate-800 h-full z-30'} bg-[var(--secondary)] dark:bg-slate-950 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-72'}`}
      role="navigation"
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden md:flex absolute -right-3 top-4 md:top-6 flex h-7 w-7 items-center justify-center rounded-full border bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 shadow-md text-gray-500 dark:text-slate-400 hover:text-[var(--primary)] dark:hover:text-[var(--primary)] transition-colors z-50 hover:bg-gray-50 dark:hover:bg-slate-800"
        aria-label={isCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div
        className={`flex h-16 md:h-20 items-center border-b border-gray-100 dark:border-slate-800/50 px-4 md:px-6 transition-all ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`}
      >
        {Logo ? (
          <div className="w-full flex items-center justify-center overflow-hidden">
            <Logo
              settings={branding}
              showText={!isCollapsed}
              useSystemLogo={!branding?.logo_url}
              className={isCollapsed ? 'h-8 w-auto' : 'h-8 w-auto'}
            />
          </div>
        ) : (
          <span className="font-bold text-xl truncate text-[var(--primary)] dark:text-white">
            {isCollapsed ? 'RV' : 'Rep Vendas'}
          </span>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-800">
        {MENU_ITEMS.map((item) => {
          const active = isItemActive(item);
          const label = item.label || item.title || '';
          const expanded = expandedMenus.includes(label);
          const hasChildren = item.children && item.children.length > 0;
          const isLink = item.href && !item.href.startsWith('#');
          const Icon = item.icon || Circle;

          // BRANDING DINÂMICO AQUI:
          const baseItemClass = `group flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition-colors duration-200 ease-in-out outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] border-l-4 border-transparent`;
          const activeClass = `bg-[var(--primary)] bg-opacity-10 shadow-sm border-[var(--primary)] transition-colors duration-200 ease-in-out`;
          const inactiveClass = `text-gray-600 hover:bg-[var(--primary)] hover:bg-opacity-10 dark:text-slate-400 dark:hover:bg-[var(--primary)] dark:hover:bg-opacity-10`;

          const labelClass = active
            ? 'truncate text-[var(--primary-foreground)] font-medium'
            : 'truncate text-gray-700 dark:text-slate-400 group-hover:text-[var(--primary-foreground)] dark:group-hover:text-[var(--primary-foreground)]';

          const content = (
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-3.5 min-w-0">
                <Icon
                  size={20}
                  className={`flex-shrink-0 transition-colors text-gray-500 dark:text-slate-500 ${active ? 'text-[var(--primary-foreground)]' : 'group-hover:text-[var(--primary-foreground)] dark:group-hover:text-[var(--primary-foreground)]'}`}
                  aria-hidden
                />
                {!isCollapsed && <span className={labelClass}>{label}</span>}
              </div>
              {hasChildren && !isCollapsed && (
                <ChevronDown
                  size={16}
                  className={`flex-shrink-0 text-gray-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
                />
              )}
            </div>
          );

          return (
            <div key={label} className="mb-1">
              {isLink ? (
                <Link
                  href={item.href}
                  onClick={(e) => {
                    if (hasChildren) {
                      e.preventDefault();
                      toggleSubmenu(label);
                    }
                  }}
                  className={`${baseItemClass} ${active ? activeClass : inactiveClass}`}
                  title={isCollapsed ? label : ''}
                >
                  {content}
                </Link>
              ) : (
                <button
                  onClick={() => toggleSubmenu(label)}
                  className={`w-full ${baseItemClass} ${active ? activeClass : inactiveClass}`}
                  title={isCollapsed ? label : ''}
                >
                  {content}
                </button>
              )}

              {hasChildren && expanded && !isCollapsed && (
                <div className="mt-1 ml-4 space-y-0.5 border-l-2 border-gray-100 dark:border-slate-800 pl-3 animate-in slide-in-from-left-2 duration-200">
                  {item.children!.map((child) => {
                    const childActive = child.exact
                      ? pathname === child.href
                      : pathname?.startsWith(child.href);
                    const ChildIcon = child.icon || Circle;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`group/sub flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-200 ease-in-out border-l-4 ${childActive ? 'bg-[var(--primary)] bg-opacity-10 font-medium border-[var(--primary)]' : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-[var(--primary)] hover:bg-opacity-10 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-[var(--primary)] dark:hover:bg-opacity-10'}`}
                      >
                        <ChildIcon
                          size={16}
                          className={`flex-shrink-0 transition-colors text-gray-400 dark:text-slate-600 ${childActive ? 'text-[var(--primary-foreground)]' : 'group-hover/sub:text-[var(--primary-foreground)] dark:group-hover/sub:text-[var(--primary-foreground)]'}`}
                          aria-hidden
                        />
                        <span
                          className={`truncate ${childActive ? 'text-[var(--primary-foreground)] font-medium' : 'text-gray-500 dark:text-slate-500 group-hover/sub:text-[var(--primary-foreground)] dark:group-hover/sub:text-[var(--primary-foreground)]'}`}
                        >
                          {child.title}
                        </span>
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
