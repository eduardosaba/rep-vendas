'use client';

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // Crucial para o fluxo pós-login no iOS
        storageKey: 'repvendas-auth-token'
      }
    }
  );
}

export async function createClientAsync() {
  const { createBrowserClient: createClientDynamic } = await import('@supabase/ssr');
  return createClientDynamic(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'repvendas-auth-token'
      }
    }
  );
}