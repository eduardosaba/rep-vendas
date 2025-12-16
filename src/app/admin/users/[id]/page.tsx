import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft, Save, Shield, Calendar, CreditCard } from 'lucide-react';
import { updateUserLicense } from '../actions';

export default async function EditUserPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const { id } = params;

  // 1. Proteção Admin
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  if (!currentUser) redirect('/login');

  // 2. Buscar Perfil Alvo
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !profile) {
    return notFound();
  }

  // Helper para formatar data para input (YYYY-MM-DD)
  const formattedDate = profile.subscription_ends_at
    ? new Date(profile.subscription_ends_at).toISOString().split('T')[0]
    : '';

  // Prepara a server action com o ID já "preso" (bind)
  const updateUserWithId = updateUserLicense.bind(null, profile.id);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/admin"
          className="p-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"
        >
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerir Licença</h1>
          <p className="text-sm text-gray-500">
            Usuário: {profile.full_name || 'Sem Nome'} ({profile.email})
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <Shield className="rv-text-primary" size={20} />
          <h2 className="font-semibold text-gray-900">
            Detalhes da Assinatura
          </h2>
        </div>

        <form action={updateUserWithId} className="p-6 space-y-6">
          {/* Seleção de Plano */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <CreditCard size={16} /> Plano
            </label>
            <select
              name="plan"
              defaultValue={profile.plan || 'free'}
              className="w-full rounded-lg border-gray-300 border px-3 py-2.5 focus:ring-2 focus:ring-[var(--primary)] outline-none bg-white"
            >
              <option value="free">Gratuito (Free)</option>
              <option value="pro">Profissional (Pro)</option>
              <option value="enterprise">Empresarial (Enterprise)</option>
            </select>
          </div>

          {/* Status da Assinatura */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Shield size={16} /> Status
            </label>
            <select
              name="status"
              defaultValue={profile.subscription_status || 'trial'}
              className="w-full rounded-lg border-gray-300 border px-3 py-2.5 focus:ring-2 focus:ring-[var(--primary)] outline-none bg-white"
            >
              <option value="trial">Período de Teste (Trial)</option>
              <option value="active">Ativo (Pago)</option>
              <option value="past_due">Atrasado (Past Due)</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          {/* Validade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Calendar size={16} /> Expira em
            </label>
            <input
              type="date"
              name="ends_at"
              defaultValue={formattedDate}
              className="w-full rounded-lg border-gray-300 border px-3 py-2.5 focus:ring-2 focus:ring-[var(--primary)] outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Deixe em branco para acesso indeterminado.
            </p>
          </div>

          {/* Info Read-only */}
          <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="block text-gray-500 text-xs uppercase">
                ID do Usuário
              </span>
              <span className="font-mono text-gray-700 text-xs break-all">
                {profile.id}
              </span>
            </div>
            <div>
              <span className="block text-gray-500 text-xs uppercase">
                Criado em
              </span>
              <span className="font-mono text-gray-700">
                {new Date(profile.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="rv-btn-primary flex items-center gap-2 px-4 sm:px-6 py-2.5 font-medium shadow-sm transition-all"
            >
              <Save size={18} />
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
