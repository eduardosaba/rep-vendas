import React from 'react';
// CORREÇÃO: Usando o caminho que você mostrou anteriormente (@/lib/supabaseServer)
import createClient from '@/lib/supabaseServer';

import ManageExternalImagesClient from '@/components/dashboard/ManageExternalImagesClient';

export const metadata = {
  title: 'Gerenciar Imagens Externas',
};

// Evita prerender que faria fetch ao Supabase durante o build
export const dynamic = 'force-dynamic';

export default async function Page() {
  // Inicializa o cliente do Supabase
  const supabase = await createClient();

  // Busca os produtos que têm URL externa mas não têm imagem interna (image_path nulo)
  const { data, error } = await supabase
    .from('products')
    .select('id, name, reference_code, external_image_url')
    .is('image_path', null)
    .not('external_image_url', 'is', null)
    .order('id', { ascending: true });

  if (error) {
    console.error('Erro ao buscar produtos para processar imagens:', error);
  }

  // Garante que products seja um array mesmo se der erro
  const products = data || [];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">
        Gerenciar Imagens Externas
      </h1>
      <p className="mb-6 text-sm text-gray-600">
        Lista de produtos importados via Excel que possuem link, mas a imagem
        ainda não foi salva no sistema.
      </p>

      {/* Carrega o componente cliente (a tabela e o botão de sincronizar) */}
      <ManageExternalImagesClient initialProducts={products} />
    </div>
  );
}
