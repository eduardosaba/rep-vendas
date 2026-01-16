export type UserRole = 'master' | 'template' | 'rep' | 'representative';

export interface UserProfile {
  id: string;
  email?: string | null;
  full_name?: string | null;
  role: UserRole | string;
}
