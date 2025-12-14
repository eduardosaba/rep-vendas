'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Bell,
  Search,
  LogOut,
  User,
  Settings,
  Store,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

interface NotificationOrder {
  id: string;
  client_name_guest: string;
  total_value: number;
  created_at: string;
  display_id: number;
}

export function DashboardHeader() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Estados de Interface
  const [isUserOpen, setIsUserOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Estados de Dados
  const [notifications, setNotifications] = useState<NotificationOrder[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Dados do Usuário e Loja
  const [storeName, setStoreName] = useState('Painel de Controle');
  const [catalogSlug, setCatalogSlug] = useState(''); // Novo estado para o link
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('Carregando...');

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  // 1. Fechar menus ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserOpen(false);
      }
      if (
        notifMenuRef.current &&
        !notifMenuRef.current.contains(event.target as Node)
      ) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 2. Carregar Dados Iniciais
  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setUserEmail(user.email || '');
      setUserRole('Conta Master');

      // Busca Nome e SLUG da Loja nas Configurações (com resiliência .maybeSingle())
      const { data: settings } = await supabase
        .from('settings')
        .select('name, catalog_slug')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settings) {
        if (settings.name) setStoreName(settings.name);
        if (settings.catalog_slug) setCatalogSlug(settings.catalog_slug);
      }

      // Busca Pedidos Pendentes
      const { data: pendingOrders } = await supabase
        .from('orders')
        .select('id, client_name_guest, total_value, created_at, display_id')
        .eq('user_id', user.id)
        .eq('status', 'Pendente')
        .order('created_at', { ascending: false })
        .limit(10);

      if (pendingOrders) {
        setNotifications(pendingOrders);
        setUnreadCount(pendingOrders.length);
      }
    };

    fetchData();
  }, [supabase]);

  // 3. Realtime Notificações
  useEffect(() => {
    const channel = supabase
      .channel('header-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const newOrder = payload.new as NotificationOrder;
          toast.success(`Novo pedido recebido! #${newOrder.display_id || ''}`);
          setNotifications((prev) => [newOrder, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.replace('/login');
  };

  const markAsRead = () => {
    setUnreadCount(0);
    setIsNotifOpen(false);
    router.push('/dashboard/orders');
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-4 sticky top-0 z-30 shadow-sm">
      {/* Busca (Visual) */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center bg-gray-100 dark:bg-slate-900 px-3 py-2 rounded-lg w-64">
          <Search size={18} className="text-gray-400" />
          <input
            type="text"
            placeholder="Buscar..."
            className="bg-transparent border-none outline-none text-sm ml-2 w-full text-gray-700 dark:text-gray-200 placeholder-gray-400"
          />
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Notificações */}
        <div className="relative" ref={notifMenuRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 relative transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-950 animate-pulse"></span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="p-3 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-semibold text-sm text-gray-900">
                  Notificações
                </h3>
                {unreadCount > 0 && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                    {unreadCount} novas
                  </span>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    Nenhuma notificação recente.
                  </div>
                ) : (
                  notifications.map((order) => (
                    <div
                      key={order.id}
                      className="p-3 border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                      onClick={() =>
                        router.push(`/dashboard/orders?id=${order.id}`)
                      }
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-indigo-600 text-xs">
                          Pedido #{order.display_id}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(order.created_at).toLocaleTimeString(
                            'pt-BR',
                            { hour: '2-digit', minute: '2-digit' }
                          )}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                        {order.client_name_guest || 'Cliente'}
                      </p>
                      <p className="text-xs text-green-600 font-bold mt-1">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(order.total_value || 0)}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={markAsRead}
                className="w-full py-2 text-xs font-medium text-center text-indigo-600 hover:bg-indigo-50 border-t border-gray-100 transition-colors"
              >
                Ver todos os pedidos
              </button>
            </div>
          )}
        </div>

        {/* Menu do Usuário */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserOpen(!isUserOpen)}
            className="flex items-center gap-3 p-1.5 rounded-full hover:bg-gray-50 dark:hover:bg-slate-800 border border-transparent hover:border-gray-200 transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
              {storeName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left mr-1">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 leading-none mb-0.5">
                {storeName}
              </p>
              <p
                className="text-[10px] text-gray-400 leading-none truncate max-w-[120px]"
                title={userEmail}
              >
                {userEmail || userRole}
              </p>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {/* Dropdown */}
          {isUserOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-top-2 p-1">
              <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-800 mb-1">
                <p className="text-xs font-bold text-gray-500 uppercase">
                  Conta Logada
                </p>
                <p
                  className="text-sm font-medium text-gray-900 truncate"
                  title={userEmail}
                >
                  {userEmail}
                </p>
              </div>

              <Link
                href="/dashboard/settings"
                onClick={() => setIsUserOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings size={16} /> Configurações da Loja
              </Link>

              {/* FIX: Link correto para a página de usuário */}
              <Link
                href="/dashboard/user"
                onClick={() => setIsUserOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <User size={16} /> Meu Perfil
              </Link>

              {/* FIX: Link dinâmico para a loja usando o SLUG */}
              <a
                href={catalogSlug ? `/${catalogSlug}` : '/'}
                target="_blank"
                onClick={() => setIsUserOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors my-1"
              >
                <Store size={16} /> Ver Minha Loja
              </a>

              <div className="border-t border-gray-100 dark:border-slate-800 mt-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut size={16} /> Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
