import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft, UserCog } from 'lucide-react';
import { EditUserForm } from './edit-user-form';
import { getPlans, getUserWithSubscription } from '../actions';

export default async function EditUserPage(props: any) {
  const { params } = props as { params: { id: string } };
  const supabase = await createClient();
  const { id } = await params;

  // 1. Verificar permissão
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  if (!currentUser) redirect('/login');

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single();

  const isAllowed = myProfile?.role === 'admin' || myProfile?.role === 'master';
  if (!isAllowed) redirect('/dashboard');

  // 2. BUSCAR DADOS
  const [plansRes, userRes] = await Promise.all([
    getPlans(),
    getUserWithSubscription(id),
  ]);

  const availablePlans = plansRes.success && plansRes.data ? plansRes.data : [];
  const profile = userRes.success ? userRes.data : null;

  if (!profile) {
    return notFound();
  }

  // 3. Buscar perfil de quem desativou (se houver)
  let disabledByProfile: { id: string; email?: string; full_name?: string } | null = null;
  if (profile.disabled_by) {
    try {
      const { supabaseAdmin } = await import('@/infrastructure/supabase/admin');
      const { data: dProfile } = await (supabaseAdmin as any)
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', profile.disabled_by)
        .maybeSingle();
      if (dProfile) {
        disabledByProfile = dProfile;
      }
    } catch (err) {
      // Ignorar falha sem bloquear renderização da página
    }
  }

  // 4. Normalizar dados da assinatura
  const subData = Array.isArray(profile.subscriptions)
    ? profile.subscriptions.length > 0
      ? profile.subscriptions[0]
      : null
    : profile.subscriptions;

  const formattedDate = subData?.current_period_end
    ? new Date(subData.current_period_end).toISOString().split('T')[0]
    : '';

  const initialFormData = {
    email: profile.email || '',
    fullName: profile.full_name || profile.name || '',
    role: profile.role || 'rep',
    plan: subData?.plan_name || availablePlans[0]?.name || 'Free',
    status: subData?.status || 'trialing',
    endsAt: formattedDate,
    estados: profile.estados || [],
    brands: profile.brands || [],
    is_active: profile.is_active,
    disabled_at: profile.disabled_at || null,
    disabled_by: profile.disabled_by || null,
    disabled_reason: profile.disabled_reason || null,
    disabledByProfile: disabledByProfile,
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in pb-10">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/users"
          className="p-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"
        >
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UserCog className="text-indigo-600" />
            Editar Usuário
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {profile.email} • ID:{' '}
            <span className="font-mono">{profile.id}</span>
          </p>
        </div>
      </div>

      <EditUserForm
        userId={profile.id}
        initialData={initialFormData}
        availablePlans={availablePlans}
      />
    </div>
  );
}
