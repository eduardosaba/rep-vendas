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
  sku: {
    table: 'products',
    column: 'sku',
    type: 'text',
    critical: false,
    label: 'SKU / Código Individual (sku)',
    allowOperational: true,
    allowGlobal: true,
  },
  barcode: {
    table: 'products',
    column: 'barcode',
    type: 'text',
    critical: false,
    label: 'Código de Barras / EAN (barcode)',
    allowOperational: true,
    allowGlobal: true,
  },
  name: {
    table: 'products',
    column: 'name',
    type: 'text',
    critical: false,
    label: 'Nome do Produto (name)',
    allowOperational: true,
    allowGlobal: true,
  },
  reference_code: {
    table: 'products',
    column: 'reference_code',
    type: 'text',
    critical: false,
    label: 'Código da Referência (reference_code)',
    allowOperational: true,
    allowGlobal: true,
  },
  reference_id: {
    table: 'products',
    column: 'reference_id',
    type: 'text',
    critical: false,
    label: 'Código de Agrupamento de Modelo / Cores (reference_id)',
    allowOperational: true,
    allowGlobal: true,
  },
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
  is_best_seller: {
    table: 'products',
    column: 'is_best_seller',
    type: 'boolean',
    critical: false,
    label: 'Destaque / Mais Vendido - Canônico (is_best_seller)',
    allowOperational: true,
    allowGlobal: true,
  },
  is_destaque: {
    table: 'products',
    column: 'is_destaque',
    type: 'boolean',
    critical: false,
    label: 'Destaque Manual (is_destaque)',
    allowOperational: true,
    allowGlobal: true,
  },
  price_on_request: {
    table: 'products',
    column: 'price_on_request',
    type: 'boolean',
    critical: false,
    label: 'Preço sob Consulta (price_on_request)',
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
  original_price: {
    table: 'products',
    column: 'original_price',
    type: 'currency',
    critical: false,
    label: 'Preço Original / "De" (original_price)',
    allowOperational: true,
    allowGlobal: true,
  },
  cost_price: {
    table: 'products',
    column: 'cost', // Alias de domínio/UI para a coluna física cost
    type: 'currency',
    critical: false,
    label: 'Preço de Custo (cost_price -> cost)',
    allowOperational: true,
    allowGlobal: true,
  },
  stock_quantity: {
    table: 'products',
    column: 'stock_quantity',
    type: 'integer',
    critical: false,
    label: 'Estoque Quantidade (stock_quantity)',
    allowOperational: true,
    allowGlobal: true,
  },
  min_stock_level: {
    table: 'products',
    column: 'min_stock_level',
    type: 'integer',
    critical: false,
    label: 'Estoque Mínimo (min_stock_level)',
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
  material: {
    table: 'products',
    column: 'material',
    type: 'text',
    critical: false,
    label: 'Material (material)',
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
  color: {
    table: 'products',
    column: 'color',
    type: 'text',
    critical: false,
    label: 'Cor / Acabamento (color)',
    allowOperational: true,
    allowGlobal: true,
  },
  gender: {
    table: 'products',
    column: 'gender',
    type: 'text',
    critical: false,
    label: 'Gênero (gender)',
    allowOperational: true,
    allowGlobal: true,
  },
  description: {
    table: 'products',
    column: 'description',
    type: 'text',
    critical: false,
    label: 'Descrição (description)',
    allowOperational: true,
    allowGlobal: true,
  },
  technical_specs: {
    table: 'products',
    column: 'technical_specs',
    type: 'text', // Coluna física text na tabela products
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
