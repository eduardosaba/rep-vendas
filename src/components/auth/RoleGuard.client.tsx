'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function RoleGuard({ allowedRoles, children, redirectTo = '/admin/unauthorized' }: { allowedRoles: string[]; children: React.ReactNode; redirectTo?: string; }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    const check = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = (userData as any)?.user;
        if (!user) {
          if (mounted) router.replace('/login');
          return;
        }

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
        const role = (profile as any)?.role || 'individual';
        if (allowedRoles.includes(role)) {
          if (mounted) setAllowed(true);
        } else {
          if (mounted) router.replace(redirectTo);
        }
      } catch (e) {
        console.error('RoleGuard error', e);
        if (mounted) router.replace(redirectTo);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    check();
    return () => { mounted = false; };
  }, [allowedRoles, redirectTo, router]);

  if (loading) return <p>Carregando...</p>;
  if (!allowed) return null;
  return <>{children}</>;
}
