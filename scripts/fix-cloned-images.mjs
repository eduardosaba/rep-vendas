import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

let envContent = '';
if (fs.existsSync('.env.local')) envContent = fs.readFileSync('.env.local', 'utf-8');
else if (fs.existsSync('.env')) envContent = fs.readFileSync('.env', 'utf-8');

const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY;

const supabase = createClient(url, key);

async function run() {
  const brandArg = process.argv[2] || '';
  console.log(`🔍 Buscando produtos fonte/template com imagens sincronizadas... ${brandArg ? `(Marca: ${brandArg})` : ''}`);

  // 1. Encontrar produtos fonte que já têm image_path ou image_variants
  let query = supabase
    .from('products')
    .select('id, reference_code, brand, image_path, image_variants, gallery_images, image_optimized')
    .not('image_path', 'is', null);

  if (brandArg) {
    query = query.ilike('brand', `%${brandArg}%`);
  }

  const { data: sourceProducts, error } = await query;
  if (error || !sourceProducts) {
    console.error('Erro ao buscar produtos fonte:', error);
    return;
  }

  console.log(`📦 Encontrados ${sourceProducts.length} produtos fonte com imagens salvas.`);

  let totalClonesUpdated = 0;

  for (const src of sourceProducts) {
    // Buscar clones que derivam desse produto (por original_product_id ou source_product_id ou mesmo reference_code e marca)
    const { data: clones, error: cloneErr } = await supabase
      .from('products')
      .select('id, user_id, reference_code')
      .or(`original_product_id.eq.${src.id},source_product_id.eq.${src.id}`)
      .neq('id', src.id);

    if (clones && clones.length > 0) {
      for (const clone of clones) {
        const { error: updateErr } = await supabase
          .from('products')
          .update({
            image_path: src.image_path,
            image_variants: src.image_variants,
            gallery_images: src.gallery_images,
            image_url: null,
            external_image_url: null,
            images: null,
            image_optimized: true,
            sync_status: 'synced',
            updated_at: new Date().toISOString(),
          })
          .eq('id', clone.id);

        if (!updateErr) {
          totalClonesUpdated++;
        } else {
          console.error(`Erro ao atualizar clone ${clone.id}:`, updateErr.message);
        }
      }
    }
  }

  console.log(`\n✅ Sucesso! ${totalClonesUpdated} produtos clonados foram atualizados com as imagens otimizadas.`);
}

run();
