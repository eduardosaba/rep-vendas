export type UserRole = 'master' | 'template' | 'rep' | 'representative';

export interface UserProfile {
  id: string;
  email?: string | null;
  full_name?: string | null;
  name?: string | null;
  role: UserRole | string;
  is_active: boolean;
  disabled_at?: string | null;
  disabled_by?: string | null;
  disabled_reason?: string | null;
  created_at?: string;
  company_id?: string | null;
  status?: string | null;
  trial_ends_at?: string | null;
}

