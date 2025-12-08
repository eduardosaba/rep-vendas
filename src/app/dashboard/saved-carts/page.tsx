import React from 'react';
import { createClient } from '@/lib/supabase/server';

type SavedCart = {
  id: string;
  short_id: string;
  cart_items: Array<{ id: string; name: string; quantity: number }>;
  created_at: string | null;
};

// Evita prerender que faria fetch ao Supabase durante o build
export const dynamic = 'force-dynamic';

export default async function Page() {
  const ensureSupabaseEnv = () => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      // eslint-disable-next-line no-console
      console.error(
        'Faltam variáveis de ambiente Supabase: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
      throw new Error(
        'Configuração inválida: verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
    }
  };

  ensureSupabaseEnv();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('saved_carts')
    .select('id, short_id, cart_items, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Pedidos Salvos</h1>
        <div className="text-red-600">
          Erro ao buscar pedidos: {String(error.message)}
        </div>
      </div>
    );
  }

  const rows: SavedCart[] = (data || []) as any;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Pedidos Salvos</h1>

      {rows.length === 0 ? (
        <div className="text-sm text-gray-600">
          Nenhum pedido salvo encontrado.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <div
              key={row.id}
              className="bg-white rounded-lg shadow p-4 border border-gray-100"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                    {row.short_id}
                  </span>
                  <div className="text-sm text-gray-600">
                    {row.cart_items?.length ?? 0} itens
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {row.created_at
                    ? new Date(row.created_at).toLocaleString('pt-BR')
                    : '-'}
                </div>
              </div>

              <details className="text-sm">
                <summary className="cursor-pointer rv-text-primary">
                  Ver itens
                </summary>
                <ul className="mt-2 space-y-1">
                  {(row.cart_items || []).map((it: any, idx: number) => (
                    <li key={idx} className="flex justify-between">
                      <span>{it.name || it.id}</span>
                      <span className="font-mono text-sm text-gray-600">
                        x{it.quantity ?? 1}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
