// Tipos globais mínimos para o projeto
// Adiciona campos opcionais usados pela UI para evitar erros de checagem

declare module NodeJS {
  interface Global {
    // allow any global additions if needed
    [key: string]: any;
  }
}

interface Product {
  id?: string;
  user_id?: string;
  name?: string;
  reference_code?: string;
  sku?: string;
  barcode?: string | null;
  price?: number;
  brand?: string | null;
  description?: string | null;
  category?: string | null;
  color?: string | null;
  image_url?: string | null;
  image_path?: string | null;
  images?: string[] | null;
  external_image_url?: string | null;
  technical_specs?: Record<string, any> | null;
  created_at?: string;
  is_active?: boolean;
  is_launch?: boolean;
  is_best_seller?: boolean;
}

export {};
