import { RepresentativeContext } from '@/shared/types/application';
import { DatabaseProfileRow } from '../queries/ProfileQueries';

export class ProfileMapper {
  static toDomain(row: DatabaseProfileRow): RepresentativeContext {
    return {
      id: row.id,
      name: row.name,
      slug: row.store_name,
      email: row.email || '',
      whatsapp: row.whatsapp || null,
    };
  }
}
