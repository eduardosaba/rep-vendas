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
  Zap,
  History, // Ícone para Saúde dos Dados
  ClipboardList, // Ícone para Gestão de Estoque
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
        title: 'Gestão de Estoque',
        href: '/dashboard/inventory',
        icon: ClipboardList,
      },
      {
        title: 'Tabela de Produtos', // Bulk Edit
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
        title: 'Sincronizador PROCV',
        href: '/dashboard/products/sync',
        icon: Zap,
      },
      {
        title: 'Saúde dos Dados', // Logs de Sincronização
        href: '/dashboard/products/sync/history',
        icon: History,
      },
      {
        title: 'Importar Excel',
        href: '/dashboard/products/import-massa',
        icon: RefreshCcw,
      },
      {
        title: 'Histórico de Importação',
        href: '/dashboard/products/import-history',
        icon: FileText,
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
  onNavigate,
}: {
  settings?: Settings | null;
  isMobile?: boolean;
  onNavigate?: () => void;
} = {}) {
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
  const isDashboardRoute =
    pathname == null ? true : pathname.startsWith('/dashboard');
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
    try {
      const storedState = localStorage.getItem('sidebarCollapsed');
      if (storedState !== null) {
        setIsCollapsed(storedState === 'true');
      } else if (
        isMobile ||
        (typeof window !== 'undefined' && window.innerWidth < 768)
      ) {
        // Default to collapsed on mobile for better UX
        setIsCollapsed(true);
      }
    } catch (e) {
      if (
        isMobile ||
        (typeof window !== 'undefined' && window.innerWidth < 768)
      ) {
        setIsCollapsed(true);
      }
    }
  }, []);

  useEffect(() => {
    if (mounted) localStorage.setItem('sidebarCollapsed', String(isCollapsed));
  }, [isCollapsed, mounted]);

  useEffect(() => {
    if (initialSettings) setBranding(initialSettings);
  }, [initialSettings]);

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

  const [cssPrimary, setCssPrimary] = useState<string>('#b9722e');
  const [cssSecondary, setCssSecondary] = useState<string>('#0d1b2c');

  useEffect(() => {
    if (!mounted) return;
    const updateColors = () => {
      const root = document.documentElement;
      const primaryFromCSS =
        root.style.getPropertyValue('--primary').trim() ||
        getComputedStyle(root).getPropertyValue('--primary').trim() ||
        '#b9722e';
      const secondaryFromCSS =
        root.style.getPropertyValue('--secondary').trim() ||
        getComputedStyle(root).getPropertyValue('--secondary').trim() ||
        '#0d1b2c';
      setCssPrimary(primaryFromCSS);
      setCssSecondary(secondaryFromCSS);
    };
    updateColors();
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    });
    return () => observer.disconnect();
  }, [mounted]);

  const primary = branding?.primary_color || cssPrimary;
  const primaryForeground = isLightHex(primary) ? '#0f172a' : '#ffffff';
  const secondaryRaw = branding?.secondary_color || cssSecondary;
  const secondary =
    getLuminance(secondaryRaw) > 0.96 ? '#f3f4f6' : secondaryRaw;

  const rootVars: React.CSSProperties & Record<string, string> = {
    '--primary': primary,
    '--primary-foreground': primaryForeground,
    '--secondary': secondary,
  } as React.CSSProperties & Record<string, string>;

  if (!mounted) {
    return (
      <aside
        className={`relative flex flex-col border-r h-full bg-[#f8fafc] dark:bg-slate-950 ${isCollapsed ? 'w-20' : 'w-72'}`}
        aria-hidden
      >
        <div className="h-16 border-b border-gray-200 dark:border-slate-800" />
        <div className="flex-1 p-4" />
      </aside>
    );
  }

  if (!isDashboardRoute) return null;

  return (
    <aside
      style={rootVars}
      className={`${isMobile ? 'fixed inset-y-0 left-0 z-50' : 'relative flex flex-col border-r dark:border-slate-800 h-full z-30'} bg-[#f8fafc] dark:bg-slate-950 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-72'}`}
      role="navigation"
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden md:flex absolute -right-3 top-4 md:top-6 h-7 w-7 items-center justify-center rounded-full border bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 shadow-md text-gray-500 hover:text-[var(--primary)] transition-colors z-50 hover:bg-gray-50"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Header Identificador */}
      <div className="flex h-16 items-center justify-center border-b px-4 border-gray-200 dark:border-slate-800">
        {isCollapsed ? (
          <span className="font-bold text-xl text-[var(--primary)]">RV</span>
        ) : (
          <div className="flex flex-col items-center">
            <span className="font-bold text-lg tracking-wide text-slate-800 dark:text-white">
              Painel Gestão
            </span>
            <span className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold">
              RepVendas v0.1
            </span>
          </div>
        )}
      </div>

      {/* Logo Component */}
      <div
        className={`flex h-16 md:h-20 items-center border-b border-gray-100 dark:border-slate-800/50 px-4 md:px-6 transition-all ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`}
      >
        {Logo && (
          <div className="w-full flex items-center justify-center overflow-hidden">
            <Logo
              settings={branding}
              showText={!isCollapsed}
              useSystemLogo={!branding?.logo_url}
              className="h-8 w-auto"
            />
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-4 overflow-y-auto scrollbar-thin">
        {MENU_ITEMS.map((item) => {
          const active = isItemActive(item);
          const label = item.label || item.title || '';
          const expanded = expandedMenus.includes(label);
          const hasChildren = item.children && item.children.length > 0;
          const isLink = item.href && !item.href.startsWith('#');
          const Icon = item.icon || Circle;

          const baseItemClass = `group flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-bold transition-all duration-200 border-l-4 border-transparent`;
          const activeClass = `bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)] shadow-sm`;
          const inactiveClass = `text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50 hover:text-slate-900`;

          const content = (
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  size={18}
                  className={`flex-shrink-0 transition-colors ${active ? 'text-[var(--primary)]' : 'text-slate-400 group-hover:text-slate-600'}`}
                />
                {!isCollapsed && <span className="truncate">{label}</span>}
              </div>
              {hasChildren && !isCollapsed && (
                <ChevronDown
                  size={14}
                  className={`flex-shrink-0 text-slate-300 transition-transform duration-300 ${expanded ? 'rotate-180' : ' '}`}
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
                      return;
                    }
                    if (onNavigate) onNavigate();
                  }}
                  className={`${baseItemClass} ${active ? activeClass : inactiveClass}`}
                >
                  {content}
                </Link>
              ) : (
                <button
                  onClick={() => toggleSubmenu(label)}
                  className={`w-full ${baseItemClass} ${active ? activeClass : inactiveClass}`}
                >
                  {content}
                </button>
              )}

              {hasChildren && expanded && !isCollapsed && (
                <div className="mt-1 ml-4 space-y-0.5 border-l-2 border-slate-100 dark:border-slate-800 pl-3 animate-in slide-in-from-left-2">
                  {item.children!.map((child) => {
                    const childActive = pathname?.startsWith(child.href);
                    const ChildIcon = child.icon || Circle;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => onNavigate && onNavigate()}
                        className={`group/sub flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider transition-all ${childActive ? 'text-[var(--primary)] bg-[var(--primary)]/5' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                      >
                        <ChildIcon
                          size={14}
                          className={
                            childActive
                              ? 'text-[var(--primary)]'
                              : 'text-slate-300'
                          }
                        />
                        <span className="truncate">{child.title}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer Branding */}
      <div className="border-t p-4 border-gray-200 dark:border-slate-800">
        <div
          className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ' '}`}
        >
          <img
            src="https://aawghxjbipcqefmikwby.supabase.co/storage/v1/object/public/logos/logos/repvendas.svg"
            alt="RepVendas"
            className="h-6 w-auto max-w-[120px] object-contain"
            style={{ height: 'auto' }}
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              img.src = '/images/default-logo.png';
            }}
          />
          {!isCollapsed && (
            <div className="flex flex-col text-[10px] font-black text-slate-400 uppercase tracking-tighter">
              <span>Plataforma</span>
              <span className="text-[var(--primary)]">RepVendas 2025</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
