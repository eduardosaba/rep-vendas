import { TargetLayer } from './field-registry';

export type ScopeType =
  | 'PLATFORM_GLOBAL'
  | 'ORGANIZATION'
  | 'ORGANIZATION_LIST'
  | 'USER_AUTHORSHIP'
  | 'GLOBAL'
  | 'COMPANY'
  | 'USER';

export interface ScopeConfig {
  type: ScopeType;
  targetOrganizationIds?: string[];
  targetCompanyIds?: string[];
  targetUserIds?: string[];
  brandFilter?: string;
  createMissingRelations?: boolean; // Default false in V1
}

export function validateLayerScopeCompatibility(layer: TargetLayer, scope: ScopeConfig): { valid: boolean; reason?: string } {
  if (layer === 'global' && (scope.type === 'USER' || scope.type === 'USER_AUTHORSHIP')) {
    return { valid: false, reason: 'Camada Global não permite escopo por Usuário.' };
  }

  if (layer === 'company' && (scope.type !== 'COMPANY' && scope.type !== 'ORGANIZATION' && scope.type !== 'ORGANIZATION_LIST')) {
    return { valid: false, reason: 'Camada Empresa permite apenas escopo por EMPRESA ou ORGANIZAÇÃO.' };
  }

  if (layer === 'user' && (scope.type !== 'USER' && scope.type !== 'USER_AUTHORSHIP')) {
    return { valid: false, reason: 'Camada Usuário permite apenas escopo por USUÁRIO.' };
  }

  const orgIds = scope.targetOrganizationIds || scope.targetCompanyIds || [];
  if ((scope.type === 'COMPANY' || scope.type === 'ORGANIZATION' || scope.type === 'ORGANIZATION_LIST') && orgIds.length === 0) {
    return { valid: false, reason: 'Selecione ao menos uma organização/empresa para este escopo.' };
  }

  if ((scope.type === 'USER' || scope.type === 'USER_AUTHORSHIP') && (!scope.targetUserIds || scope.targetUserIds.length === 0)) {
    return { valid: false, reason: 'Selecione ao menos um usuário para o escopo por Usuário.' };
  }

  return { valid: true };
}
