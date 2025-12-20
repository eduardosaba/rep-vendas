// Compat shim: re-exportar a implementação principal do `supabaseServer.ts`
// para caminhos que importam `@/lib/supabase/server`.

export {
  createClient,
  createRouteSupabase,
  createServerSupabase,
} from '../supabaseServer';

export { default } from '../supabaseServer';
