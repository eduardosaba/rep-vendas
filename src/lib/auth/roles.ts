export const ADMIN_ROLES = [
  'master',
  'admin',
  'admin_company',
  'company_admin',
  'template',
] as const;

export const GLOBAL_ADMIN_ROLES = [
  'master',
] as const;

export const COMPANY_ADMIN_ROLES = [
  'admin_company',
  'company_admin',
  'owner',
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export function isMaster(role: string | null | undefined): boolean {
  if (!role) return false;
  return role.trim().toLowerCase() === 'master';
}

export function isAdminRole(role: string | null | undefined): role is AdminRole {
  if (!role) return false;
  const cleanRole = role.trim().toLowerCase();
  return ADMIN_ROLES.includes(cleanRole as AdminRole);
}

export function isGlobalAdmin(role: string | null | undefined): boolean {
  return isMaster(role);
}

export function isCompanyAdmin(role: string | null | undefined): boolean {
  if (!role) return false;
  const cleanRole = role.trim().toLowerCase();
  return COMPANY_ADMIN_ROLES.includes(cleanRole as any);
}

export function getRoleDisplayLabel(role: string | null | undefined): string {
  if (!role) return 'Usuário';
  const clean = role.trim().toLowerCase();
  switch (clean) {
    case 'master':
      return 'Master';
    case 'admin_company':
    case 'company_admin':
      return 'Administrador da Empresa';
    case 'representative':
    case 'rep':
      return 'Representante Comercial';
    case 'template':
      return 'Conta Modelo';
    case 'client_guest':
      return 'Cliente Convidado';
    default:
      return role;
  }
}
