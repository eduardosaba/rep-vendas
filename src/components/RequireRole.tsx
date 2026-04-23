import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

type Props = {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
};

export default async function RequireRole({ children, allowedRoles, redirectTo = '/login' }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // redirect to login if not authenticated
    redirect(redirectTo);
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = (profile as any)?.role || 'individual';

  if (!allowedRoles.includes(role)) {
    return (
      <div className="p-6">
        <h3 className="text-lg font-bold">Acesso negado</h3>
        <p className="text-sm text-slate-600">Sua conta não tem permissão para acessar esta área.</p>
      </div>
    );
  }

  return <>{children}</>;
}
