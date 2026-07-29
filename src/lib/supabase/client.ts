'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const globalForSupabase = globalThis as typeof globalThis & {
  supabaseBrowserClient?: SupabaseClient;
};

export function createClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase não configurado: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY ausente.'
    );
  }

  if (globalForSupabase.supabaseBrowserClient) {
    return globalForSupabase.supabaseBrowserClient;
  }

  const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'repvendas-auth-token',
      flowType: 'pkce',
    },
    cookieOptions: {
      name: 'repvendas-auth-token',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    },
    global: {
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    },
  });

  globalForSupabase.supabaseBrowserClient = client;

  return client;
}

export async function createClientAsync(): Promise<SupabaseClient> {
  return createClient();
}
