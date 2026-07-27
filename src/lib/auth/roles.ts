export const ADMIN_ROLES = [
  'master',
  'admin',
  'admin_company',
  'company_admin',
] as const;

export const GLOBAL_ADMIN_ROLES = [
  'master',
  'admin',
] as const;

export const COMPANY_ADMIN_ROLES = [
  'admin_company',
  'company_admin',
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export function isAdminRole(role: string | null | undefined): role is AdminRole {
  return ADMIN_ROLES.includes(role as AdminRole);
}

export function isGlobalAdmin(role: string | null | undefined) {
  return GLOBAL_ADMIN_ROLES.includes(role as any);
}

export function isCompanyAdmin(role: string | null | undefined) {
  return COMPANY_ADMIN_ROLES.includes(role as any);
}
