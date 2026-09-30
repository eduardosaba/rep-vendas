/**
 * Script para reparar caminhos corrompidos com ?t= em products
 * Execução: node scripts/fix-corrupted-product-images.mjs [--apply]
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Erro: Credenciais Supabase ausentes.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const APPLY = process.argv.includes('--apply');

function cleanPathString(p) {
  if (!p || typeof p !== 'string') return p;
  let s = p.split('?')[0].trim();
  // Limpar sufixos concatenados incorretamente: ex: -1200w.webp-1200w.webp ou -1200w.webp-480w.webp
  while (/(?:-(480w|1200w)\.webp){2,}$/i.test(s)) {
    s = s.replace(/-(480w|1200w)\.webp$/i, '');
  }
  return s;
}

function cleanUrlString(u) {
  if (!u || typeof u !== 'string') return u;
  return u.split('?')[0].trim();
}

function cleanGalleryArray(gallery) {
  if (!Array.isArray(gallery)) return gallery;
  return gallery.map((item) => {
    if (!item || typeof item !== 'object') return item;
    const cleanUrl = cleanUrlString(item.url);
    const cleanPath = cleanPathString(item.path);

    const variants = Array.isArray(item.variants)
      ? item.variants.map((v) => ({
          ...v,
          url: cleanUrlString(v.url),
          path: cleanPathString(v.path),
        }))
      : item.variants;

    return {
      ...item,
      url: cleanUrl,
      path: cleanPath,
      variants,
    };
  });
}

async function run() {
  console.log(`Modo: ${APPLY ? 'APPLY (gravando alterações)' : 'DRY-RUN (somente leitura)'}\n`);

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, image_path, image_url, gallery_images, image_variants, linked_images')
    .or('image_path.ilike.%?t=%,image_url.ilike.%?t=%,image_path.ilike.%-1200w.webp-%');

  if (error) {
    console.error('Erro ao buscar produtos:', error);
    return;
  }

  console.log(`Produtos encontrados com caminhos anômalos: ${products.length}`);

  for (const prod of products) {
    const newImagePath = cleanPathString(prod.image_path);
    const newImageUrl = cleanUrlString(prod.image_url);
    const newGallery = cleanGalleryArray(prod.gallery_images);
    const newVariants = cleanGalleryArray([{ variants: prod.image_variants }])?.[0]?.variants;
    const newLinked = Array.isArray(prod.linked_images)
      ? prod.linked_images.map(cleanUrlString)
      : prod.linked_images;

    console.log(`\nProduto [${prod.id}] "${prod.name}":`);
    console.log(`  image_path antigo : ${prod.image_path}`);
    console.log(`  image_path corrigido: ${newImagePath}`);
    console.log(`  image_url antigo  : ${prod.image_url}`);
    console.log(`  image_url corrigido : ${newImageUrl}`);

    if (APPLY) {
      const { error: updErr } = await supabase
        .from('products')
        .update({
          image_path: newImagePath,
          image_url: newImageUrl,
          gallery_images: newGallery,
          image_variants: newVariants,
          linked_images: newLinked,
          updated_at: new Date().toISOString(),
        })
        .eq('id', prod.id);

      if (updErr) {
        console.error(`  ❌ Erro ao atualizar produto ${prod.id}:`, updErr.message);
      } else {
        console.log(`  ✅ Produto ${prod.id} atualizado com sucesso!`);
      }
    }
  }

  if (!APPLY && products.length > 0) {
    console.log('\nExecute com --apply para persistir as correções no banco.');
  }
}

run();
