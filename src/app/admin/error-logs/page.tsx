import React from 'react';
import createServerClient from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

export default async function ErrorLogsPage() {
  // Prefer service role for admin pages to bypass RLS and ensure full visibility
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabase = adminKey && supabaseUrl
    ? createSupabaseAdmin(String(supabaseUrl), String(adminKey), { auth: { autoRefreshToken: false, persistSession: false } })
    : await createServerClient();

  const { data, error } = await supabase
    .from('error_logs')
    .select('id, created_at, url, error_type, message, user_agent, stack_trace, user_id')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-bold">Logs de Erro</h2>
        <p className="text-sm text-red-600 mt-2">Falha ao buscar logs: {String(error.message)}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold mb-4">Logs de Erro (últimos 200)</h2>
      <div className="overflow-x-auto">
        <table className="w-full table-auto text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 uppercase">
              <th className="p-2">Quando</th>
              <th className="p-2">Tipo</th>
              <th className="p-2">URL</th>
              <th className="p-2">Mensagem</th>
              <th className="p-2">User Agent</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(data) && data.length > 0 ? (
              data.map((r: any) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="p-2 align-top w-40">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-2 align-top">{r.error_type}</td>
                  <td className="p-2 align-top max-w-xs truncate">{r.url}</td>
                  <td className="p-2 align-top max-w-lg break-words">{r.message}</td>
                  <td className="p-2 align-top max-w-xs truncate">{r.user_agent}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-4" colSpan={5}>
                  Nenhum log encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
