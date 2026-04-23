import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type RolePerms = {
  allowed_tabs?: string[];
  allowed_sidebar?: string[];
  [k: string]: any;
};

const FALLBACK_PERMISSIONS: Record<string, RolePerms> = {
  master: {
    allowed_tabs: ['geral', 'appearance', 'display', 'institucional', 'pages', 'estoque', 'perfil'],
    allowed_sidebar: ['Visão Geral', 'Pedidos', 'Distribuidora', 'Gestão da Distribuidora', 'Produtos', 'Marketing', 'Ferramentas', 'Clientes', 'Equipe', 'Comunicados', 'Configurações', 'Ajuda'],
  },
  admin_company: {
    allowed_tabs: ['geral', 'appearance', 'display', 'institucional', 'pages', 'estoque', 'perfil'],
    allowed_sidebar: ['Visão Geral', 'Pedidos', 'Distribuidora', 'Gestão da Distribuidora', 'Produtos', 'Marketing', 'Clientes', 'Equipe', 'Comunicados', 'Configurações', 'Ajuda'],
  },
  rep: {
    allowed_tabs: ['geral', 'appearance', 'display', 'estoque', 'perfil'],
    allowed_sidebar: ['Visão Geral', 'Pedidos', 'Produtos', 'Marketing', 'Clientes', 'Configurações', 'Ajuda'],
  },
  representative: {
    allowed_tabs: ['geral', 'perfil'],
    allowed_sidebar: ['Visão Geral', 'Pedidos', 'Distribuidora', 'Clientes', 'Configurações', 'Ajuda'],
  },
  template: {
    allowed_tabs: ['geral', 'appearance', 'display', 'institucional', 'pages', 'estoque', 'perfil'],
    allowed_sidebar: ['Visão Geral', 'Pedidos', 'Produtos', 'Marketing', 'Clientes', 'Configurações', 'Ajuda'],
  },
};

export function usePermissions() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [dbPerms, setDbPerms] = useState<RolePerms | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (mounted) setLoading(true);
      try {
        const session = await supabase.auth.getUser();
        const user = session?.data?.user;
        if (!user) {
          if (mounted) setLoading(false);
          return;
        }

        const profileRes = await supabase
          .from('profiles')
          .select('role,company_id')
          .eq('id', user.id)
          .maybeSingle();
        const profile = profileRes?.data as any | null;
        const r = profile?.role || null;
        if (mounted) setRole(r);

        if (r) {
          // Try to read role-specific mapping from role_permissions
          // Support both legacy `data` jsonb and the row-based columns used by the admin UI
          const permsRes = await supabase
            .from('role_permissions')
            .select('allowed_tabs,allowed_sidebar_labels,can_manage_catalog,data,updated_at')
            .eq('role', r)
            .maybeSingle();

          const chosen = permsRes?.data ?? null;
          let resolved: any = null;
          if (chosen) {
            if (
              Array.isArray(chosen.allowed_tabs) ||
              Array.isArray(chosen.allowed_sidebar_labels) ||
              Object.prototype.hasOwnProperty.call(chosen, 'can_manage_catalog')
            ) {
              resolved = {
                allowed_tabs: chosen.allowed_tabs ?? undefined,
                allowed_sidebar: chosen.allowed_sidebar_labels ?? undefined,
                can_manage_catalog: typeof chosen.can_manage_catalog !== 'undefined' ? Boolean(chosen.can_manage_catalog) : undefined,
              };
            } else if (chosen.data) {
              resolved = chosen.data;
            }
          }

          if (mounted) setDbPerms(resolved as RolePerms ?? null);
        }
      } catch (e) {
        // ignore failures and rely on fallback
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    // Re-carrega sempre que a Torre de Controle emitir o evento de atualização
    const handlePermissionsUpdated = () => { load(); };
    if (typeof window !== 'undefined') {
      window.addEventListener('permissions-updated', handlePermissionsUpdated);
    }

    return () => {
      mounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('permissions-updated', handlePermissionsUpdated);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = useMemo(() => {
    if (dbPerms) return dbPerms;
    if (role && (FALLBACK_PERMISSIONS as any)[role]) return (FALLBACK_PERMISSIONS as any)[role];
    return { allowed_tabs: [], allowed_sidebar: [] } as RolePerms;
  }, [dbPerms, role]);

  function hasTab(id: string) {
    // Normalize checks: allow matching against common Portuguese keys as well
    const allowed = active.allowed_tabs || [];
    const normalize = (s: string) => String(s || '').toLowerCase();
    const target = normalize(id);
    return Boolean(
      allowed.find((a: string) => {
        const n = normalize(a);
        if (n === target) return true;
        // common translations
        const map: Record<string, string[]> = {
          general: ['geral'],
          gallery: ['galeria'],
          stock: ['estoque'],
          pages: ['pages'],
          appearance: ['appearance'],
          display: ['display'],
          institucional: ['institucional'],
        };
        // check if target matches any mapped key for 'a' or vice-versa
        for (const [canon, synonyms] of Object.entries(map)) {
          if (canon === target && synonyms.includes(n)) return true;
          if (n === canon && synonyms.includes(target)) return true;
          if (n === target) return true;
          if (synonyms.includes(target) && synonyms.includes(n)) return true;
        }
        return false;
      })
    );
  }

  function hasSidebarItem(label: string) {
    // normalize label comparison
    const allowed = active.allowed_sidebar || [];
    return Boolean(allowed.find((l: string) => String(l).toLowerCase() === String(label).toLowerCase()));
  }

  return { hasTab, hasSidebarItem, loading, role, permissions: active } as const;
}
