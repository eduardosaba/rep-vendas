export interface AllowedFieldDefinition {
  table: string;
  column: string;
  type: 'boolean' | 'currency' | 'integer' | 'text';
  critical: boolean;
  label: string;
}

export type TargetLayer = 'global' | 'company' | 'user';

export const LAYER_AVAILABILITY: Record<TargetLayer, { enabled: boolean; label: string; description: string }> = {
  global: {
    enabled: true,
    label: 'Catálogo Global (products)',
    description: 'Altera o produto-base no banco de dados principal',
  },
  company: {
    enabled: false,
    label: 'Dados da Empresa (company_products - Em breve)',
    description: 'Requer tabela de relacionamento por empresa (em desenvolvimento)',
  },
  user: {
    enabled: false,
    label: 'Dados do Usuário (user_products - Em breve)',
    description: 'Requer tabela de relacionamento por usuário (em desenvolvimento)',
  },
};

export const UPDATE_FIELD_REGISTRY: Record<TargetLayer, Record<string, AllowedFieldDefinition>> = {
  global: {
    is_active: {
      table: 'products',
      column: 'is_active',
      type: 'boolean',
      critical: true,
      label: 'Produto Ativo (Global)',
    },
    price: {
      table: 'products',
      column: 'price',
      type: 'currency',
      critical: true,
      label: 'Preço de Tabela Base (price)',
    },
    sale_price: {
      table: 'products',
      column: 'sale_price',
      type: 'currency',
      critical: true,
      label: 'Preço Promocional / Oferta (sale_price)',
    },
    cost_price: {
      table: 'products',
      column: 'cost',
      type: 'currency',
      critical: false,
      label: 'Preço de Custo (cost)',
    },
    stock_quantity: {
      table: 'products',
      column: 'stock',
      type: 'integer',
      critical: false,
      label: 'Estoque (stock)',
    },
    colecao: {
      table: 'products',
      column: 'colecao',
      type: 'text',
      critical: false,
      label: 'Coleção (Global)',
    },
    brand: {
      table: 'products',
      column: 'brand',
      type: 'text',
      critical: false,
      label: 'Marca (Global)',
    },
    tipo_montagem: {
      table: 'products',
      column: 'tipo_montagem',
      type: 'text',
      critical: false,
      label: 'Tipo de Montagem / Armação (tipo_montagem)',
    },
  },

  company: {},
  user: {},
};

export function getFieldDefinition(layer: TargetLayer, fieldKey: string): AllowedFieldDefinition | null {
  if (!LAYER_AVAILABILITY[layer]?.enabled) return null;
  const layerRegistry = UPDATE_FIELD_REGISTRY[layer];
  if (!layerRegistry) return null;
  return layerRegistry[fieldKey] || null;
}
