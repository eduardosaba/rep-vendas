import { SupabaseClient } from '@supabase/supabase-js';

export interface DatabaseProfileRow {
  id: string;
  name: string;
  store_name: string | null;
  organization_id: string | null;
  role: string;
  email?: string;
  whatsapp?: string;
}

export class ProfileQueries {
  constructor(private readonly client: SupabaseClient) {}

  async findRepresentativeBySlug(slug: string, organizationId: string): Promise<DatabaseProfileRow | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('id, name, store_name, organization_id, role, email, whatsapp')
      .eq('store_name', slug.toLowerCase())
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error || !data) return null;
    return data as DatabaseProfileRow;
  }
}
