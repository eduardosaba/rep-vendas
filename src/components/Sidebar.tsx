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
  History,
  ClipboardList,
} from 'lucide-react';
import Logo from './Logo';
import { createClient } from '@/lib/supabase/client';
import type { Settings } from '@/lib/types';

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
        title: 'Gestão de Estoque',
        href: '/dashboard/inventory',
        icon: ClipboardList,
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
  { icon: Zap, label: 'Marketing', href: '/dashboard/marketing' },
  {
    icon: FileText,
    label: 'Ferramentas',
    href: '#tools',
    children: [
      {
        title: 'Saúde dos Dados',
        href: '/dashboard/products/sync/history',
        icon: History,
      },
      {
        title: 'Sincronizador PROCV',
        href: '/dashboard/products/sync',
        icon: Zap,
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

interface SidebarProps {
  settings?: Settings | null;
  onNavigate?: () => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (value: boolean) => void;
  isMobile?: boolean;
}

export function Sidebar({
  settings: initialSettings,
  onNavigate,
  isCollapsed = false,
  setIsCollapsed,
  isMobile = false,
}: SidebarProps) {
  const pathname = usePathname();
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([
    'Produtos',
    'Ferramentas',
  ]);
  const [branding, setBranding] = useState<Settings | null>(
    initialSettings || null
  );
  const [isMaster, setIsMaster] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  const isDashboardRoute = pathname?.startsWith('/dashboard');

  useEffect(() => {
    setMounted(true);
    // Detect small screens (mobile) to allow Sidebar to auto-close when items clicked,
    // even if parent doesn't pass `isMobile` prop.
    const updateWidth = () =>
      setIsSmallScreen(
        typeof window !== 'undefined' ? window.innerWidth < 1024 : false
      );
    updateWidth();
    window.addEventListener('resize', updateWidth);
    const loadBranding = async () => {
      try {
        const res = await supabase.auth.getUser();
        const user = res?.data?.user;
        if (!user) return;
        // detect master user on client using public env var
        const MASTER_EMAIL =
          (process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL as string) ||
          (process.env.NEXT_PUBLIC_MASTER_EMAIL as string) ||
          '';
        const MASTER_USER_ID =
          (process.env.NEXT_PUBLIC_MASTER_USER_ID as string) || '';
        const ADMINS = (process.env.NEXT_PUBLIC_ADMINS as string) || '';

        let masterDetected = false;
        if (MASTER_EMAIL && user.email === MASTER_EMAIL) masterDetected = true;
        if (MASTER_USER_ID && user.id === MASTER_USER_ID) masterDetected = true;
        if (ADMINS) {
          const list = ADMINS.split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          if (user.email && list.includes(user.email)) masterDetected = true;
        }
        if (masterDetected) setIsMaster(true);
        const settingsRes = await supabase
          .from('settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        const data = settingsRes?.data ?? null;
        if (data) setBranding(data as Settings);
      } catch (err) {
        // não deixar erro no carregamento do branding quebrar o sidebar
        // log opcional: console.warn('loadBranding failed', err)
      }
    };
    if (!initialSettings) loadBranding();
    // Inscreve em updates de settings para refletir mudanças (ex: font_family)
    let settingsChannel: any = null;
    const setupRealtime = async () => {
      try {
        const res = await supabase.auth.getUser();
        const user = res?.data?.user;
        if (!user) return;

        settingsChannel = supabase
          .channel('realtime-settings')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'settings',
              filter: `user_id=eq.${user.id}`,
            },
            (payload: any) => {
              // Mescla mudanças no estado de branding
              setBranding((prev) => ({
                ...((prev as any) || {}),
                ...(payload.new || {}),
              }));
            }
          )
          .subscribe();
      } catch (e) {
        // ignore realtime failures
      }
    };

    setupRealtime();
    return () => {
      window.removeEventListener('resize', updateWidth);
      try {
        if (settingsChannel) supabase.removeChannel(settingsChannel);
      } catch {}
    };
  }, [initialSettings, supabase]);

  const toggleSubmenu = (label: string) => {
    if (isCollapsed) {
      setIsCollapsed?.(false);
      setExpandedMenus([label]);
    } else {
      setExpandedMenus((prev) =>
        prev.includes(label)
          ? prev.filter((i) => i !== label)
          : [...prev, label]
      );
    }
  };

  if (!mounted || !isDashboardRoute) return null;

  const primary = branding?.primary_color || '#b9722e';
  const brandFont = (branding as any)?.font_family || undefined;

  return (
    <aside
      style={brandFont ? { fontFamily: brandFont } : undefined}
      className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-[#f8fafc] dark:bg-slate-950 dark:border-slate-800 transition-all duration-300 lg:relative ${
        isCollapsed
          ? '-translate-x-full lg:translate-x-0 lg:w-20'
          : 'translate-x-0 w-72'
      }`}
    >
      {/* Botão de colapsar interno (Desktop) */}
      {!isMobile && setIsCollapsed && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-6 h-7 w-7 items-center justify-center rounded-full border bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 shadow-md text-gray-500 hover:text-[var(--primary)] z-50"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      )}

      {/* Header do Sidebar */}
      <div className="flex h-16 items-center justify-center border-b border-gray-200 dark:border-slate-800 px-4">
        {isCollapsed ? (
          <span
            className="font-bold text-xl text-[var(--primary)]"
            style={{ color: primary }}
          >
            RV
          </span>
        ) : (
          <div className="flex flex-col items-center">
            <span className="font-bold text-lg text-slate-800 dark:text-white">
              Painel Gestão
            </span>
            <span className="text-[9px] uppercase tracking-widest text-slate-400">
              RepVendas v 1.0.0
            </span>
          </div>
        )}
      </div>

      {/* Navegação */}
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto scrollbar-thin">
        {MENU_ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname?.startsWith(item.href);
          const hasChildren = !!item.children;
          const expanded = expandedMenus.includes(item.label);
          const Icon = item.icon;

          return (
            <div key={item.label} className="mb-1">
              {hasChildren ? (
                // Em telas pequenas, navegar ao clicar no item pai; manter chevron para abrir submenu
                isMobile || isSmallScreen ? (
                  <Link
                    href={item.href}
                    onClick={() => {
                      onNavigate?.();
                      if ((isMobile || isSmallScreen) && setIsCollapsed)
                        setIsCollapsed(true);
                    }}
                    className={`group flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-bold cursor-pointer transition-all border-l-4 ${
                      active
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]'
                        : 'text-slate-500 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50'
                    }`}
                    style={
                      active
                        ? {
                            color: primary,
                            borderColor: primary,
                            backgroundColor: `${primary}15`,
                          }
                        : {}
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        size={18}
                        className={
                          active ? 'text-[var(--primary)]' : 'text-slate-400'
                        }
                        style={active ? { color: primary } : {}}
                      />
                      {!isCollapsed && <span>{item.label}</span>}
                    </div>
                    {!isCollapsed && (
                      <ChevronDown
                        size={14}
                        onClick={(e) => {
                          // impedir que o clique no chevron dispare o link
                          e.preventDefault();
                          toggleSubmenu(item.label);
                        }}
                        className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
                      />
                    )}
                  </Link>
                ) : (
                  <div
                    onClick={() => toggleSubmenu(item.label)}
                    className={`group flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-bold cursor-pointer transition-all border-l-4 ${
                      active
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]'
                        : 'text-slate-500 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50'
                    }`}
                    style={
                      active
                        ? {
                            color: primary,
                            borderColor: primary,
                            backgroundColor: `${primary}15`,
                          }
                        : {}
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        size={18}
                        className={
                          active ? 'text-[var(--primary)]' : 'text-slate-400'
                        }
                        style={active ? { color: primary } : {}}
                      />
                      {!isCollapsed && <span>{item.label}</span>}
                    </div>
                    {!isCollapsed && (
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
                      />
                    )}
                  </div>
                )
              ) : (
                <Link
                  href={item.href}
                  onClick={() => {
                    onNavigate?.();
                    if ((isMobile || isSmallScreen) && setIsCollapsed)
                      setIsCollapsed(true);
                  }}
                  className={`group flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-bold cursor-pointer transition-all border-l-4 ${
                    active
                      ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]'
                      : 'text-slate-500 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                  style={
                    active
                      ? {
                          color: primary,
                          borderColor: primary,
                          backgroundColor: `${primary}15`,
                        }
                      : {}
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      size={18}
                      className={
                        active ? 'text-[var(--primary)]' : 'text-slate-400'
                      }
                      style={active ? { color: primary } : {}}
                    />
                    {!isCollapsed && <span>{item.label}</span>}
                  </div>
                </Link>
              )}

              {/* Submenu */}
              {hasChildren && expanded && !isCollapsed && (
                <div className="mt-1 ml-4 space-y-1 border-l-2 border-slate-100 dark:border-slate-800 pl-3">
                  {item.children.map((child) => {
                    // hide manage-external-images link from non-master and non-template users
                    const isTemplateAccount = Boolean(
                      (branding as any)?.is_template ||
                      (branding as any)?.is_template_account ||
                      (branding as any)?.template_user
                    );
                    if (
                      child.href === '/dashboard/manage-external-images' &&
                      !isMaster &&
                      !isTemplateAccount
                    ) {
                      return null;
                    }
                    if (
                      child.title === 'Gestão de Estoque' &&
                      !branding?.enable_stock_management
                    ) {
                      return null;
                    }

                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => {
                          onNavigate?.();
                          if ((isMobile || isSmallScreen) && setIsCollapsed)
                            setIsCollapsed(true);
                        }}
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider ${
                          pathname === child.href
                            ? 'text-[var(--primary)] bg-[var(--primary)]/5'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                        style={
                          pathname === child.href ? { color: primary } : {}
                        }
                      >
                        <child.icon size={14} />
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

      {/* Footer com vApp */}
      <div className="border-t p-4 border-gray-100 dark:border-slate-800">
        <div
          className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}
        >
          <img
            src="https://aawghxjbipcqefmikwby.supabase.co/storage/v1/object/public/logos/logos/repvendas.svg"
            alt="RepVendas"
            className="h-6 w-auto object-contain"
          />
          {!isCollapsed && (
            <div className="flex flex-col text-[10px] font-bold uppercase text-slate-400">
              <span className="text-slate-700 dark:text-slate-200">
                RepVendas
              </span>
              <span>v1.0.0</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
