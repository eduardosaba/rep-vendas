// Conteúdo anterior de src\lib\supabaseClient.ts

import { createClient } from '@supabase/supabase-js';
import { checkSupabaseEnv } from './env';

const { url: supabaseUrlRaw, anon: supabaseAnonRaw } = checkSupabaseEnv();

const supabaseUrl: string =
  supabaseUrlRaw || process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey: string =
  supabaseAnonRaw ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
// ... (Se houver mais código aqui, ele precisa ser ajustado.)