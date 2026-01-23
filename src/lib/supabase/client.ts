'use client';

import { createBrowserClient } from '@supabase/ssr';

// Versão síncrona do createClient utilizada amplamente pelos componentes
// client-side. Manter uma exportação async separada permite compatibilidade
// com usos que chamavam `await createClient()` anteriormente.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function createClientAsync() {
  const { createBrowserClient: createClientDynamic } =
    await import('@supabase/ssr');
  return createClientDynamic(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
