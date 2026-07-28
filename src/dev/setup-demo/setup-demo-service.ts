import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { assertDevelopmentEnvironment } from '../safety-guard';
import { createDemoOrganization } from './demo-organization';
import { createDemoUsers } from './demo-users';
import { createDemoCatalog } from './demo-catalog';

const supabaseAdmin: any = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface SetupDemoResult {
  success: boolean;
  companyId?: string;
  error?: string;
}

export class SetupDemoService {
  static async runSetup(): Promise<SetupDemoResult> {
    try {
      assertDevelopmentEnvironment();

      // 1. Criar Distribuidora
      const orgResult = await createDemoOrganization(supabaseAdmin);
      if (!orgResult.success || !orgResult.company) {
        return { success: false, error: orgResult.error };
      }

      const companyId = orgResult.company.id;

      // 2. Criar Usuários
      await createDemoUsers(supabaseAdmin, companyId);

      // 3. Criar Catálogo de 10 SKUs
      await createDemoCatalog(supabaseAdmin, companyId);

      return {
        success: true,
        companyId,
      };
    } catch (err: any) {
      console.error('[SetupDemoService] Erro:', err);
      return { success: false, error: err.message };
    }
  }
}
