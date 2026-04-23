'use server';

import React from 'react';
import { createClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = await createClient();
  const { data: profile } = await supabase.from('profiles').select('company_id,display_name').maybeSingle();
  const companyId = (profile as any)?.company_id;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Visão geral</h2>
      <p>Empresa: {(profile as any)?.display_name || '—'}</p>
      <div className="mt-4 space-y-4">
        <div className="p-4 bg-gray-50 rounded">Gerencie estoque unificado, equipe e pedidos.</div>
      </div>
    </div>
  );
}
