import { SupabaseClient } from '@supabase/supabase-js';

export interface DatabaseOrganizationRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  // Outros campos futuros (PIX, etc)
}

export class OrganizationQueries {
  constructor(private readonly client: SupabaseClient) {}

  async findBySlug(slug: string): Promise<DatabaseOrganizationRow | null> {
    const { data, error } = await this.client
      .from('organizations')
      .select('id, name, slug, logo_url, primary_color, secondary_color, accent_color')
      .eq('slug', slug.toLowerCase())
      .maybeSingle();

    if (error || !data) return null;
    return data as DatabaseOrganizationRow;
  }

  async findById(id: string): Promise<DatabaseOrganizationRow | null> {
    const { data, error } = await this.client
      .from('organizations')
      .select('id, name, slug, logo_url, primary_color, secondary_color, accent_color')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return data as DatabaseOrganizationRow;
  }
}
