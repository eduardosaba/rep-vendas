import { TargetLayer } from './field-registry';

export type ScopeType = 'GLOBAL' | 'COMPANY' | 'USER';

export interface ScopeConfig {
  type: ScopeType;
  targetCompanyIds?: string[];
  targetUserIds?: string[];
  brandFilter?: string;
  createMissingRelations?: boolean; // Default false in V1
}

export function validateLayerScopeCompatibility(layer: TargetLayer, scope: ScopeConfig): { valid: boolean; reason?: string } {
  if (layer === 'global' && scope.type !== 'GLOBAL') {
    return { valid: false, reason: 'Camada Global permite apenas escopo GLOBAL.' };
  }

  if (layer === 'company' && scope.type !== 'COMPANY') {
    return { valid: false, reason: 'Camada Empresa permite apenas escopo por EMPRESA.' };
  }

  if (layer === 'user' && scope.type !== 'USER') {
    return { valid: false, reason: 'Camada Usuário permite apenas escopo por USUÁRIO.' };
  }

  if (scope.type === 'COMPANY' && (!scope.targetCompanyIds || scope.targetCompanyIds.length === 0)) {
    return { valid: false, reason: 'Selecione ao menos uma empresa para o escopo Empresa.' };
  }

  if (scope.type === 'USER' && (!scope.targetUserIds || scope.targetUserIds.length === 0)) {
    return { valid: false, reason: 'Selecione ao menos um usuário para o escopo Usuário.' };
  }

  return { valid: true };
}
