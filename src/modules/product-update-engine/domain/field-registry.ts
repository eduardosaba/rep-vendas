export interface AllowedFieldDefinition {
  table: string;
  column: string;
  type: 'boolean' | 'currency' | 'integer' | 'text' | 'json' | 'enum' | 'image';
  critical: boolean;
  label: string;
  allowOperational: boolean;
  allowGlobal: boolean;
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
    label: 'Dados da Empresa (company_products)',
    description: 'Requer tabela de relacionamento por empresa (em desenvolvimento)',
  },
  user: {
    enabled: false,
    label: 'Dados do Usuário (user_products)',
    description: 'Requer tabela de relacionamento por usuário (em desenvolvimento)',
  },
};

export const PRODUCT_SYNC_FIELDS: Record<string, AllowedFieldDefinition> = {
  is_launch: {
    table: 'products',
    column: 'is_launch',
    type: 'boolean',
    critical: false,
    label: 'Lançamento (is_launch)',
    allowOperational: true,
    allowGlobal: true,
  },
  is_active: {
    table: 'products',
    column: 'is_active',
    type: 'boolean',
    critical: true,
    label: 'Produto Ativo (is_active)',
    allowOperational: true,
    allowGlobal: true,
  },
  price: {
    table: 'products',
    column: 'price',
    type: 'currency',
    critical: true,
    label: 'Preço de Tabela Base (price)',
    allowOperational: true,
    allowGlobal: true,
  },
  sale_price: {
    table: 'products',
    column: 'sale_price',
    type: 'currency',
    critical: true,
    label: 'Preço Promocional / Oferta (sale_price)',
    allowOperational: true,
    allowGlobal: true,
  },
  cost_price: {
    table: 'products',
    column: 'cost',
    type: 'currency',
    critical: false,
    label: 'Preço de Custo (cost)',
    allowOperational: true,
    allowGlobal: true,
  },
  stock_quantity: {
    table: 'products',
    column: 'stock_quantity', // ⚡ Coluna real confirmada na tabela PostgreSQL products
    type: 'integer',
    critical: false,
    label: 'Estoque Quantidade (stock_quantity)',
    allowOperational: true,
    allowGlobal: true,
  },
  category: {
    table: 'products',
    column: 'category',
    type: 'text',
    critical: false,
    label: 'Categoria (category)',
    allowOperational: true,
    allowGlobal: true,
  },
  colecao: {
    table: 'products',
    column: 'colecao',
    type: 'text',
    critical: false,
    label: 'Coleção (colecao)',
    allowOperational: true,
    allowGlobal: true,
  },
  brand: {
    table: 'products',
    column: 'brand',
    type: 'text',
    critical: false,
    label: 'Marca (brand)',
    allowOperational: true,
    allowGlobal: true,
  },
  tipo_montagem: {
    table: 'products',
    column: 'tipo_montagem',
    type: 'text',
    critical: false,
    label: 'Tipo de Montagem (tipo_montagem)',
    allowOperational: true,
    allowGlobal: true,
  },
  technical_specs: {
    table: 'products',
    column: 'technical_specs',
    type: 'json',
    critical: false,
    label: 'Ficha Técnica (technical_specs)',
    allowOperational: false,
    allowGlobal: true,
  },
};

export const UPDATE_FIELD_REGISTRY: Record<TargetLayer, Record<string, AllowedFieldDefinition>> = {
  global: PRODUCT_SYNC_FIELDS,
  company: {},
  user: {},
};

export function getFieldDefinition(layer: TargetLayer, fieldKey: string): AllowedFieldDefinition | null {
  if (!LAYER_AVAILABILITY[layer]?.enabled) return null;
  const layerRegistry = UPDATE_FIELD_REGISTRY[layer];
  if (!layerRegistry) return null;
  return layerRegistry[fieldKey] || null;
}
