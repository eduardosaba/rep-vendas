import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

export const runtime = 'nodejs';

/**
 * API de Sincronização com Streaming (SSE)
 * Versão aprimorada de /api/admin/sync-images com logs em tempo real
 */
export async function POST(request: Request) {
  // Autenticação (CRON_SECRET ou Sessão de Usuário no Navegador)
  const authHeader = request.headers.get('authorization') || '';
  const cronSecret = process.env.CRON_SECRET || '';

  let isAuthed = false;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    isAuthed = true;
  } else {
    try {
      const { getServerUserFallback } = await import('@/lib/supabase/getServerUserFallback');
      const user = await getServerUserFallback();
      if (user) isAuthed = true;
    } catch (e) {
      // ignore fallback error
    }
  }

  if (!isAuthed) {
    return new Response('Não autorizado', { status: 401 });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  // Parse do body
  let body: any = {};
  try {
    body = await request.json();
  } catch (e) {
    // Body vazio
  }

  const { product_ids = [], brand_id, limit = 20, force = false } = body;

  // TLS handling: do NOT mutate `NODE_TLS_REJECT_UNAUTHORIZED` here.
  if (process.env.ALLOW_INSECURE_TLS === '1') {
    console.warn(
      'ALLOW_INSECURE_TLS set: do NOT change NODE_TLS_REJECT_UNAUTHORIZED in source. Use only for local debug via your shell.'
    );
  }

  // Cria encoder para SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Helper para enviar eventos
      const sendEvent = (type: string, data: any) => {
        const message = `data: ${JSON.stringify({ type, ...data })}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      const sendLog = (
        message: string,
        level: 'info' | 'success' | 'error' | 'warning' = 'info'
      ) => {
        sendEvent('log', {
          message,
          level,
          timestamp: new Date().toISOString(),
        });
      };

      try {
        sendLog('🚀 Iniciando sincronização de imagens...', 'info');

        // 1. Busca produtos pendentes
        let query = supabase
          .from('products')
          .select(
            'id, image_url, external_image_url, images, image_path, image_variants, name, reference_code, brand, sync_error, sync_status, created_at'
          );

        if (product_ids.length > 0) {
          query = query.in('id', product_ids);
          sendLog(
            `📦 Processando ${product_ids.length} produtos específicos`,
            'info'
          );
        } else {
          if (!force) {
            query = query.or('sync_status.eq.pending,sync_status.eq.failed,image_path.is.null');
          } else {
            query = query.or('sync_status.eq.pending,sync_status.eq.failed,image_path.is.null');
          }
          if (brand_id) {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(brand_id);
            if (isUuid) {
              const { data: bObj } = await supabase.from('brands').select('name').eq('id', brand_id).maybeSingle();
              if (bObj?.name) query = query.ilike('brand', `%${bObj.name}%`);
              else query = query.ilike('brand', `%${brand_id}%`);
            } else {
              query = query.ilike('brand', `%${brand_id}%`);
            }
            sendLog(`🏷️ Filtrando por marca: ${brand_id}`, 'info');
          }
        }

        query = query.order('created_at', { ascending: false }).limit(limit);

        const { data: products, error: fetchError } = await query;

        if (fetchError) {
          sendLog(`❌ Erro ao buscar produtos: ${fetchError.message}`, 'error');
          sendEvent('complete', { success: 0, failed: 0, skipped: 0 });
          controller.close();
          return;
        }

        if (!products || products.length === 0) {
          sendLog('✅ Nenhum produto pendente encontrado', 'success');
          sendEvent('complete', { success: 0, failed: 0, skipped: 0 });
          controller.close();
          return;
        }

        sendLog(
          `📊 Encontrados ${products.length} produtos para processar`,
          'info'
        );

        const results = { success: 0, failed: 0, skipped: 0 };
        const errors: any[] = [];

        // 2. Processa cada produto
        for (let i = 0; i < products.length; i++) {
          const product = products[i];
          const brandName = typeof product.brand === 'string' ? product.brand : 'Sem marca';

          sendEvent('progress', {
            current: i + 1,
            total: products.length,
            productId: product.id,
            productName: product.name,
            brand: brandName,
          });

          sendLog(
            `\n🔄 [${i + 1}/${products.length}] Processando: ${product.name} (${product.reference_code})`,
            'info'
          );

          try {
            // Verifica se já tem image_path
            if (product.image_path && !force) {
              sendLog(`   ⏭️ Já possui image_path, pulando`, 'warning');
              results.skipped++;
              continue;
            }

            // Extrai URLs para processar
            const coverUrl = product.external_image_url || product.image_url;
            const galleryUrls: string[] = [];

            if (Array.isArray(product.images)) {
              product.images.forEach((img: any) => {
                if (typeof img === 'string' && img.startsWith('http')) {
                  galleryUrls.push(img);
                } else if (img?.url && typeof img.url === 'string' && img.url.startsWith('http')) {
                  galleryUrls.push(img.url);
                }
              });
            }

            if (!coverUrl && galleryUrls.length === 0) {
              sendLog(`   ⚠️ Nenhuma URL externa encontrada`, 'warning');
              results.skipped++;
              continue;
            }

            sendLog(
              `   📸 Cover: ${coverUrl ? 'Sim' : 'Não'} | Galeria: ${galleryUrls.length} imagens`,
              'info'
            );

            // Marca como processing
            await supabase
              .from('products')
              .update({ sync_status: 'processing' })
              .eq('id', product.id);

            // 3. Processa capa (se houver)
            let imagePath = null;
            let imageUrl = null;
            let imageVariants = null;

            if (coverUrl) {
              sendLog(`   📥 Baixando capa...`, 'info');

              try {
                const response = await fetch(coverUrl, {
                  signal: AbortSignal.timeout(30000),
                });

                if (!response.ok) {
                  throw new Error(`HTTP ${response.status}`);
                }

                const buffer = Buffer.from(await response.arrayBuffer());
                sendLog(
                  `   ✅ Download concluído (${(buffer.length / 1024).toFixed(1)} KB)`,
                  'success'
                );

                // Cria variantes otimizadas
                sendLog(`   🎨 Gerando variantes (480w, 1200w)...`, 'info');
                const brandSlug = typeof product.brand === 'string' ? product.brand.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'default';
                const refCode = (product.reference_code || product.id)
                  .trim()
                  .replace(/[^a-zA-Z0-9-_]/g, '_')
                  .substring(0, 100);
                const variants = [];

                for (const size of [480, 1200]) {
                  const webpBuffer = await sharp(buffer)
                    .resize(size, size, {
                      fit: 'inside',
                      withoutEnlargement: true,
                    })
                    .webp({ quality: 75 })
                    .toBuffer();

                  const path = `public/brands/${brandSlug}/products/${refCode}/main-${size}w.webp`;

                  // Upload para storage
                  const { error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(path, webpBuffer, {
                      upsert: true,
                      contentType: 'image/webp',
                    });

                  if (uploadError) {
                    sendLog(
                      `   ⚠️ Erro ao fazer upload ${size}w: ${uploadError.message}`,
                      'warning'
                    );
                    continue;
                  }

                  const { data: publicUrl } = supabase.storage
                    .from('product-images')
                    .getPublicUrl(path);

                  variants.push({
                    size,
                    url: publicUrl.publicUrl,
                    path,
                  });
                }

                if (variants.length > 0) {
                  imagePath = variants[variants.length - 1].path;
                  imageUrl = variants[variants.length - 1].url;
                  imageVariants = variants;
                  sendLog(
                    `   ✨ Capa processada com ${variants.length} variantes`,
                    'success'
                  );
                }
              } catch (err: any) {
                sendLog(
                  `   ❌ Erro ao processar capa: ${err.message}`,
                  'error'
                );
              }
            }

            // 4. Processa galeria
            if (galleryUrls.length > 0) {
              sendLog(
                `   🖼️ Processando ${galleryUrls.length} imagens da galeria...`,
                'info'
              );

              for (let j = 0; j < galleryUrls.length; j++) {
                const url = galleryUrls[j];
                sendLog(
                  `      [${j + 1}/${galleryUrls.length}] ${url.substring(0, 60)}...`,
                  'info'
                );

                try {
                  // Busca registro em product_images
                  const { data: imgRecord } = await supabase
                    .from('product_images')
                    .select('id')
                    .eq('product_id', product.id)
                    .eq('url', url)
                    .single();

                  if (!imgRecord) {
                    sendLog(
                      `      ⚠️ Registro não encontrado em product_images`,
                      'warning'
                    );
                    continue;
                  }

                  const response = await fetch(url, {
                    signal: AbortSignal.timeout(30000),
                  });
                  if (!response.ok) throw new Error(`HTTP ${response.status}`);

                  const buffer = Buffer.from(await response.arrayBuffer());
                  const brandSlug = typeof product.brand === 'string' ? product.brand.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'default';
                  const variants = [];

                  for (const size of [320, 640, 1000]) {
                    const webpBuffer = await sharp(buffer)
                      .resize(size, size, {
                        fit: 'inside',
                        withoutEnlargement: true,
                      })
                      .webp({ quality: 75 })
                      .toBuffer();

                    const path = `public/brands/${brandSlug}/products/${product.id}/gallery/${imgRecord.id}-${size}w.webp`;

                    await supabase.storage
                      .from('product-images')
                      .upload(path, webpBuffer, {
                        upsert: true,
                        contentType: 'image/webp',
                      });

                    const { data: publicUrl } = supabase.storage
                      .from('product-images')
                      .getPublicUrl(path);

                    variants.push({ size, url: publicUrl.publicUrl, path });
                  }

                  // Atualiza product_images
                  await supabase
                    .from('product_images')
                    .update({
                      optimized_url: variants[variants.length - 1].url,
                      storage_path: variants[variants.length - 1].path,
                      optimized_variants: variants,
                      sync_status: 'synced',
                    })
                    .eq('id', imgRecord.id);

                  sendLog(`      ✅ Processada com sucesso`, 'success');
                } catch (err: any) {
                  sendLog(`      ❌ Erro: ${err.message}`, 'error');
                }
              }
            }

            // 5. Atualiza produto modelo
            const updatePayload = {
              image_path: imagePath || product.image_path,
              image_variants: imageVariants || product.image_variants,
              image_url: null,
              external_image_url: null,
              images: null,
              image_optimized: !!imagePath,
              sync_status: 'synced',
              sync_error: null,
              updated_at: new Date().toISOString(),
            };

            await supabase
              .from('products')
              .update(updatePayload)
              .eq('id', product.id);

            // 6. Replica para produtos clonados de outros usuários
            await supabase
              .from('products')
              .update(updatePayload)
              .or(`original_product_id.eq.${product.id},source_product_id.eq.${product.id}`);

            sendLog(`   ✅ Produto sincronizado com sucesso!`, 'success');
            results.success++;
          } catch (error: any) {
            sendLog(`   ❌ Erro fatal: ${error.message}`, 'error');

            await supabase
              .from('products')
              .update({
                sync_status: 'failed',
                sync_error: error.message,
              })
              .eq('id', product.id);

            errors.push({
              id: product.id,
              name: product.name,
              error: error.message,
            });

            results.failed++;
          }
        }

        // 6. Envia resultado final
        sendLog(`\n🎉 Sincronização concluída!`, 'success');
        sendLog(
          `✅ Sucesso: ${results.success} | ❌ Falhas: ${results.failed} | ⏭️ Pulados: ${results.skipped}`,
          'info'
        );

        sendEvent('complete', {
          success: results.success,
          failed: results.failed,
          skipped: results.skipped,
          errors: errors.slice(0, 10),
        });

        controller.close();
      } catch (error: any) {
        sendLog(`❌ Erro fatal: ${error.message}`, 'error');
        sendEvent('error', { message: error.message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
