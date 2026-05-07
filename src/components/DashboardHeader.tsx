'use client';

import { createClient } from '@/lib/supabase/client';
import {
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Cpu,
  CreditCard,
  HelpCircle,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  Package,
  Percent,
  Rocket,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  ToggleLeft,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

interface AdminSidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
}

export default function AdminSidebar({
  isCollapsed,
  setIsCollapsed,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (isMounted) setUserRole(profile?.role || null);
      } catch (err) {
        console.error("Erro ao buscar role:", err);
      }
    };

    fetchRole();
    return () => { isMounted = false; };
  }, [supabase]);

  const handleOpenDashboard = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const supResp = await fetch('/api/auth/session').catch(() => null);
      if (supResp && supResp.ok) {
        const supJson = await supResp.json().catch(() => ({}));
        const token = supJson?.access_token || null;

        if (token) {
          await fetch('/api/admin/impersonate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({}),
          }).catch(() => null);
        }
      }
    } catch (err) {
      console.error('Erro ao processar impersonate:', err);
    } finally {
      window.open('/dashboard', '_blank', 'noopener');
    }
  }, []);

  // Lista de itens restaurada (Item 1)
  const menuItems = [
    { label: 'Visão Geral', href: '/admin', icon: LayoutDashboard, exact: true },
    { label: 'Editar Experiência', href: '/admin/configuracoes/catalogo', icon: ImageIcon },
    { label: 'Usuários', href: '/admin/users', icon: Users },
    { label: 'Distribuidores', href: '/admin/companies', icon: Users },
    { label: 'Pedidos B2B', href: '/admin/distribuidora/pedidos', icon: ShoppingBag },
    { label: 'Assinaturas', href: '/admin/licenses', icon: CreditCard },
    { label: 'Fechamento Mensal', href: '/admin/financeiro/fechamento', icon: Percent },
    { label: 'Clonar Catálogo', href: '/admin/clone-user', icon: Copy },
    { label: 'Auditoria de Sinc.', href: '/admin/sync-logs', icon: History },
    { label: 'Sincronizador Master', href: '/admin/products/master-sync', icon: ShieldCheck },
    { label: 'Auditoria Catalogo', href: '/admin/audit', icon: ImageIcon },
    { label: 'Status Importação', href: '/admin/import-status', icon: BarChart2 },
    { label: 'Planos & Preços', href: '/admin/plans', icon: Package },
    { label: 'Matriz de Recursos', href: '/admin/plans/features', icon: ShieldCheck },
    { label: 'Controle de Features', href: '/admin/features', icon: ToggleLeft },
    { label: 'Métricas Globais', href: '/admin/metrics', icon: BarChart2 },
    { label: 'Curadoria de Dados', href: '/admin/curadoria', icon: ShieldCheck },
    { label: 'Torre de Controle', href: '/admin/clear', icon: Cpu },
    { label: 'Logs & Debug', href: '/admin/debug', icon: ShieldAlert },
    { label: 'Auditoria de Erro', href: '/admin/error-logs', icon: ShieldAlert },
    { label: 'Novidades', href: '/admin/updates', icon: Rocket },
    { label: 'Configurações', href: '/admin/settings', icon: Settings },
  ];

  if (!mounted) return null;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-slate-950 transition-all duration-300 border-r border-gray-200 dark:border-slate-800 lg:relative ${
        isCollapsed ? '-translate-x-full lg:translate-x-0 lg:w-20' : 'translate-x-0 w-64'
      }`}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden lg:flex absolute -right-3 top-8 h-6 w-6 items-center justify-center rounded-full border shadow-sm z-50 bg-white border-gray-200 text-gray-500 hover:text-primary dark:bg-slate-800 dark:border-gray-700"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="flex h-16 items-center justify-center border-b px-4 dark:border-slate-800">
        {isCollapsed ? (
          <span className="font-black text-xl text-primary">T</span>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-col">
              <span className="font-black text-lg tracking-tight dark:text-white">TORRE<span className="text-primary">.</span></span>
              <span className="text-[9px] font-black uppercase text-slate-400">Admin Master</span>
            </div>
            <button onClick={handleOpenDashboard} className="text-primary p-1 rounded hover:bg-primary/5">
              <LayoutDashboard size={18} />
            </button>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-3 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-primary/10 text-primary ring-1 ring-primary/10' : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
              <Icon size={18} className={isActive ? 'text-primary' : ''} />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}

        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 space-y-2">
          <button
            onClick={handleOpenDashboard}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5 ${isCollapsed ? 'justify-center' : ''}`}
          >
            <LayoutDashboard size={18} />
            {!isCollapsed && <span>Abrir Dashboard</span>}
          </button>
        </div>
      </nav>

      {/* Rodapé com Logotipo Restaurado (Item 2) */}
      <div className="border-t p-4 border-gray-100 dark:border-slate-800">
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <img
            src="https://aawghxjbipcqefmikwby.supabase.co/storage/v1/object/public/logos/logos/repvendas.svg"
            alt="RepVendas"
            className="h-6 w-auto object-contain"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/default-logo.png'; }}
          />
          {!isCollapsed && (
            <div className="flex flex-col text-[10px] font-bold uppercase text-slate-400">
              <span className="text-slate-700 dark:text-slate-200">RepVendas</span>
              <span>v1.0.0</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}