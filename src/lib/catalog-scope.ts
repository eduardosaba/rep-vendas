export type CatalogScopeType = 'PERSONAL' | 'BUSINESS';

export interface CatalogScope {
  type: CatalogScopeType;
  organizationId: string | null;
  userId: string;
}

export function resolveCatalogScope(profile: { role: string; organization_id?: string | null }, user: { id: string }): CatalogScope {
  // Se o usuário tem perfil de gestor/administrador, ele opera no catálogo MASTER da empresa.
  // Caso contrário, assume que opera em seu próprio catálogo legado de representante.
  if (['admin', 'master', 'operador'].includes(profile.role)) {
    return {
      type: 'BUSINESS',
      organizationId: profile.organization_id || null,
      userId: user.id
    };
  }

  return {
    type: 'PERSONAL',
    organizationId: profile.organization_id || null,
    userId: user.id
  };
}
