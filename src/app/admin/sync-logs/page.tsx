import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import Link from 'next/link'; // Importação adicionada
import React from 'react';

export const revalidate = 0;

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);

export default async function SyncLogsPage({
  searchParams,
}: {
  searchParams?: Promise<{ user?: string }>;
}) {
  try {
    const params = await searchParams;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user)
      return (
        <div className="p-8 max-w-5xl mx-auto">
          <h1 className="text-2xl font-black">Acesso negado</h1>
          <p className="text-slate-500 mt-2">Você precisa estar autenticado.</p>
        </div>
      );

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAllowed = profile?.role === 'admin' || profile?.role === 'master';

    if (!isAllowed)
      return (
        <div className="p-8 max-w-5xl mx-auto">
          <h1 className="text-2xl font-black">Acesso negado</h1>
          <p className="text-slate-500 mt-2">
            Somente administradores podem ver estes logs.
          </p>
        </div>
      );

    const query = supabaseAdmin
      .from('audit_logs')
      .select(
        'id, user_id, action, meta, allowed, reason, attempted_font, final_font, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(200);

    if (params?.user) {
      query.eq('user_id', params.user);
    }

    const { data: logs, error } = await query;

    if (error)
      return (
        <div className="p-8 max-w-5xl mx-auto">
          <h1 className="text-2xl font-black">Erro</h1>
          <p className="text-red-500 mt-2">{error.message}</p>
        </div>
      );

    const AuditLogsTable = (await import('@/components/admin/AuditLogsTable'))
      .default;

    return (
      <div className="p-8 max-w-5xl mx-auto animate-in fade-in duration-500">
        <header className="mb-8">
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
            Auditoria de Sincronização
          </h1>
          <p className="text-slate-500 mt-1">
            Últimos registros de movimentações, alterações e auditoria do
            sistema.
          </p>
        </header>

        {/* --- FORMULÁRIO DE FILTRO COM MELHORIA DE UX --- */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-8">
          <form
            className="flex flex-col md:flex-row items-end gap-4"
            method="get"
          >
            <div className="flex-1 space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Filtrar por User ID
              </label>
              <input
                name="user"
                defaultValue={params?.user || ''}
                className="w-full border-slate-200 px-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                placeholder="Ex: 550e8400-e29b-41d4-a716..."
              />
            </div>

            <div className="flex items-center gap-3">
              <button className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10">
                Filtrar Logs
              </button>

              {/* Botão para Limpar Filtro - Só aparece se houver filtro ativo */}
              {params?.user && (
                <Link
                  href="/admin/sync-logs"
                  className="px-6 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                  Limpar
                </Link>
              )}
            </div>
          </form>
        </div>

        <AuditLogsTable logs={(logs || []) as any} />
      </div>
    );
  } catch (err: any) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-black text-red-600">Erro Crítico</h1>
        <p className="text-slate-500 mt-2">
          {err?.message || 'Erro inesperado ao carregar auditoria.'}
        </p>
      </div>
    );
  }
}
