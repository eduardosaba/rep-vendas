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

// Which target layers each scope is allowed to touch.
export const LAYER_SCOPE_MATRIX: Record<ScopeType, TargetLayer[]> = {
  PLATFORM_GLOBAL: ['global', 'company', 'user'],
  GLOBAL: ['global'],
  ORGANIZATION: ['company', 'user'],
  ORGANIZATION_LIST: ['company', 'user'],
  COMPANY: ['company'],
  USER: ['user'],
  USER_AUTHORSHIP: ['user'],
};

export const SCOPE_LABELS: Record<ScopeType, string> = {
  PLATFORM_GLOBAL: 'Plataforma Global (Master)',
  GLOBAL: 'Global (Base do Sistema)',
  ORGANIZATION: 'Organização Específica',
  ORGANIZATION_LIST: 'Lista de Organizações',
  COMPANY: 'Empresa Específica',
  USER: 'Usuário Específico',
  USER_AUTHORSHIP: 'Usuário (Autor dos Registros)',
};

export function allowedLayersForScope(scope: ScopeConfig): TargetLayer[] {
  return LAYER_SCOPE_MATRIX[scope.type] || [];
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
