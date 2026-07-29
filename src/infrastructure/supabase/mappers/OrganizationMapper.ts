import { OrganizationContext, BrandingContext } from '@/shared/types/application';
import { DatabaseOrganizationRow } from '../queries/OrganizationQueries';

export class OrganizationMapper {
  static toDomain(row: DatabaseOrganizationRow): OrganizationContext {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
    };
  }

  static toBrandingDomain(row: DatabaseOrganizationRow): BrandingContext {
    return {
      primaryColor: row.primary_color,
      secondaryColor: row.secondary_color,
      logoUrl: row.logo_url,
      // Defaulting to null since accent_color is handled differently or not universally present
      bannerUrl: null, 
    };
  }
}
