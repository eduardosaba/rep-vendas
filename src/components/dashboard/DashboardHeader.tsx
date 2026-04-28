'use client';

import ImpersonateBanner from '@/components/dashboard/ImpersonateBanner';
import NotificationDropdown from '@/components/NotificationDropdown';
import { createClient } from '@/lib/supabase/client';
import { ChevronDown, LogOut, Menu, Moon, Sun, User } from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
// Importamos a Server Action de logout para garantir a limpeza dos cookies
import { logout } from '@/app/login/actions';

interface UserProfileUpdatePayload {
  new: {
    avatar_url?: string;
    [key: string]: unknown;
  };
}

export default function DashboardHeader({
  onMenuClick,
}: {
  onMenuClick?: () => void;
}) {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const [userEmail, setUserEmail] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // delegated to shared util for easier testing and configuration
  // import dynamically to avoid top-level cycles in some test setups
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getPageTitle: _getPageTitle } =
    require('@/lib/routeTitles') as typeof import('@/lib/routeTitles');
  const getPageTitle = _getPageTitle as (p: string) => string;

  async function getUser() {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);
        setUserEmail(user.email || '');

        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url, role')
          .eq('id', user.id)
          .maybeSingle();

        const avatarUrl =
          profile?.avatar_url || user.user_metadata?.avatar_url || null;
        setUserAvatar(avatarUrl);
        const role = profile?.role || null;

        const channel = supabase
          .channel(`profile-changes-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${user.id}`,
            },
            (payload) => {
              const typedPayload =
                payload as unknown as UserProfileUpdatePayload;
              const newAvatarUrl = typedPayload.new?.avatar_url;
              if (newAvatarUrl !== undefined)
                setUserAvatar(newAvatarUrl || null);
            }
          )
          .subscribe();

        return {
          cleanup: () => {
            try {
              supabase.removeChannel(channel);
            } catch (e) {
              /* ignore */
            }
          },
          role,
        };
      }
    } catch (err) {
      console.error('DashboardHeader getUser error', err);
    }
    return undefined;
  }

  useEffect(() => {
    let tInterval: number | undefined;
    let cleanup: (() => void) | undefined;
    const init = async () => {
      const result = await getUser();
      if (result && (result as any).role === 'master') {
        // only master users should call admin impersonation status
        try {
          const res = await fetch('/api/admin/impersonate/status');
          if (res.ok) {
            const j = await res.json().catch(() => null);
            if (j?.impersonate_user_id) setIsImpersonating(true);
          }
        } catch (e) {
          // ignore network errors
        }
      }
      if (result && (result as any).cleanup) cleanup = (result as any).cleanup;
      // after user data loaded, fetch subscription/trial info
      if (userId) {
        try {
          const supabase = await createClient();
          const { data: subscription, error } = await supabase
            .from('subscriptions')
            .select('current_period_end, status')
            .eq('user_id', userId)
            .maybeSingle();
          if (
            !error &&
            subscription &&
            subscription.status === 'trial' &&
            subscription.current_period_end
          ) {
            setTrialEndsAt(subscription.current_period_end as string);
            const computeDays = () => {
              const ends = Date.parse(
                subscription.current_period_end as string
              );
              const msLeft = ends - Date.now();
              const days =
                msLeft > 0 ? Math.ceil(msLeft / (1000 * 60 * 60 * 24)) : 0;
              setTrialDaysLeft(days);
            };
            computeDays();
            tInterval = window.setInterval(computeDays, 60 * 1000);
          }
        } catch (e) {
          // ignore
        }
      }
    };
    init();
    return () => {
      if (tInterval) clearInterval(tInterval);
      if (cleanup) cleanup();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  const getInitials = (email: string) =>
    email ? email.substring(0, 2).toUpperCase() : 'US';

  return (
    <header className="sticky top-0 z-50 flex h-20 w-full items-center justify-between border-b bg-white/80 backdrop-blur-md px-6 transition-colors dark:bg-slate-950/80 dark:border-slate-800">
      <div className="flex items-center gap-4">
        {/* Botão de Menu - Visível apenas em telas menores que LG para controle do Sidebar */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={22} />
        </button>

        <h1 className="text-xl font-semibold text-gray-800 dark:text-white hidden sm:block">
          {getPageTitle(pathname || '')}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Alternador de Tema */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-full dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {isImpersonating && <ImpersonateBanner />}

        {/* Notificações (componente reutilizável) */}
        <NotificationDropdown userId={userId} />

        <div className="h-8 w-px bg-gray-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>

        {/* Menu do Usuário */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-3 cursor-pointer group focus:outline-none"
          >
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-gray-700 dark:text-white group-hover:text-[var(--primary)] transition-colors">
                Minha Conta
              </span>
              <span className="text-[10px] text-gray-500 dark:text-slate-400 truncate max-w-[120px]">
                {userEmail}
              </span>
            </div>
            <div className="h-10 w-10 rounded-full bg-[var(--primary)] bg-opacity-10 flex items-center justify-center text-[var(--primary)] border border-[var(--primary)] border-opacity-20 overflow-hidden ring-offset-2 ring-offset-white dark:ring-offset-slate-950 group-hover:ring-2 ring-[var(--primary)]/30 transition-all">
              {userAvatar ? (
                <div className="h-full w-full">
                  <img
                    src={userAvatar}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <span className="font-semibold text-xs">
                  {getInitials(userEmail)}
                </span>
              )}
            </div>
            {trialDaysLeft !== null && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-100">
                Trial {trialDaysLeft}d
              </span>
            )}
            <ChevronDown
              size={14}
              className={`text-gray-400 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-3 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="p-1">
                <Link
                  href="/dashboard/user"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <User size={16} /> Meu Perfil
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
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
