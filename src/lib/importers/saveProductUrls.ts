import { createClient } from '@/lib/supabase/client';

type ProductRow = {
  Produto?: string;
  name?: string;
  Preco?: number;
  price?: number;
  Descricao?: string;
  description?: string;
  UrlDaImagem?: string;
  external_image_url?: string;
  Referencia?: string;
  reference_code?: string;
};

export async function saveProductsFromRows(
  rows: ProductRow[],
  userId?: string
) {
  const supabase = createClient();
  const productsToInsert = rows.map((row) => ({
    user_id: userId || null,
    name: row.Produto || row.name || null,
    price: row.Preco || row.price || 0,
    sale_price: row.Preco || row.price || 0,
    description: row.Descricao || row.description || null,
    external_image_url: row.UrlDaImagem || row.external_image_url || null,
    image_path: null,
    reference_code: row.Referencia || row.reference_code || null,
  }));

  const { data, error } = await supabase
    .from('products')
    .insert(productsToInsert);
  if (error) {
    console.error('Erro ao inserir produtos:', error);
    throw error;
  }

  return data;
}
