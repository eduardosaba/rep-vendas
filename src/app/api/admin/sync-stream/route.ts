import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

export const runtime = 'nodejs';

function splitUrls(input: any): string[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.flatMap((i) => splitUrls(i));
  if (typeof input === 'object') {
    return splitUrls(input.url || input.src || input.path || input.publicUrl || input.public_url || '');
  }
  return String(input)
    .split(/[;,]/)
    .map((u) => u.trim())
    .filter((u) => u.startsWith('http'));
}

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
            'id, image_url, external_image_url, images, image_path, image_variants, gallery_images, name, reference_code, brand, sync_error, sync_status, created_at'
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

            // Extrai URLs para processar (trata ponto-e-vírgula e arrays de imagens)
            const urls = [
              ...new Set([
                ...splitUrls(product.external_image_url),
                ...splitUrls(product.image_url),
                ...splitUrls(product.images),
                ...splitUrls(product.gallery_images),
              ]),
            ];

            if (urls.length === 0) {
              sendLog(`   ⚠️ Nenhuma URL externa encontrada`, 'warning');
              results.skipped++;
              continue;
            }

            const coverUrl = urls[0];
            const galleryUrls = urls.slice(1);

            sendLog(
              `   📸 Capa Principal: Sim | Imagens de Galeria: ${galleryUrls.length}`,
              'info'
            );

            // Marca como processing
            await supabase
              .from('products')
              .update({ sync_status: 'processing' })
              .eq('id', product.id);

            // 3. Processa Capa Principal (se houver)
            let imagePath = null;
            let imageUrl = null;
            let imageVariants = null;

            const brandSlug = typeof product.brand === 'string' 
              ? product.brand.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') 
              : 'default';
            const refCode = (product.reference_code || product.id)
              .trim()
              .replace(/[^a-zA-Z0-9-_]/g, '_')
              .substring(0, 100);

            if (coverUrl) {
              sendLog(`   📥 Baixando capa...`, 'info');

              try {
                const response = await fetch(coverUrl, {
                  signal: AbortSignal.timeout(30000),
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  },
                });

                if (!response.ok) {
                  throw new Error(`HTTP ${response.status}`);
                }

                const buffer = Buffer.from(await response.arrayBuffer());
                sendLog(
                  `   ✅ Download concluído (${(buffer.length / 1024).toFixed(1)} KB)`,
                  'success'
                );

                // Cria variantes otimizadas da Capa (480w, 1200w)
                sendLog(`   🎨 Gerando variantes da capa (480w, 1200w)...`, 'info');
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

            // 4. Processa imagens de Galeria (se houver)
            const gallery: any[] = [];
            if (galleryUrls.length > 0) {
              sendLog(
                `   🖼️ Processando ${galleryUrls.length} imagens da galeria...`,
                'info'
              );

              for (let j = 0; j < galleryUrls.length; j++) {
                const gUrl = galleryUrls[j];
                const indexPad = String(j + 1).padStart(2, '0');
                sendLog(
                  `      [${j + 1}/${galleryUrls.length}] Baixando galeria ${j + 1}...`,
                  'info'
                );

                try {
                  const gRes = await fetch(gUrl, {
                    signal: AbortSignal.timeout(30000),
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    },
                  });

                  if (!gRes.ok) throw new Error(`HTTP ${gRes.status}`);

                  const gBuffer = Buffer.from(await gRes.arrayBuffer());
                  const gVariants: any[] = [];

                  for (const size of [480, 1200]) {
                    const webpBuf = await sharp(gBuffer)
                      .resize(size, size, {
                        fit: 'inside',
                        withoutEnlargement: true,
                      })
                      .webp({ quality: 75 })
                      .toBuffer();

                    const path = `public/brands/${brandSlug}/products/${refCode}/gallery-${indexPad}-${size}w.webp`;

                    await supabase.storage
                      .from('product-images')
                      .upload(path, webpBuf, {
                        upsert: true,
                        contentType: 'image/webp',
                      });

                    const { data: pUrl } = supabase.storage
                      .from('product-images')
                      .getPublicUrl(path);

                    gVariants.push({
                      size,
                      url: pUrl.publicUrl,
                      path,
                    });
                  }

                  if (gVariants.length > 0) {
                    gallery.push({
                      url: gVariants[gVariants.length - 1].url,
                      path: gVariants[gVariants.length - 1].path,
                      variants: gVariants,
                    });
                    sendLog(`      ✅ Galeria ${j + 1} convertida e salva!`, 'success');
                  }
                } catch (gErr: any) {
                  sendLog(
                    `      ⚠️ Erro ao processar imagem de galeria ${j + 1}: ${gErr.message}`,
                    'warning'
                  );
                }
              }
            }

            // 5. Atualiza produto modelo
            const updatePayload = {
              image_path: imagePath || product.image_path,
              image_variants: imageVariants || product.image_variants,
              gallery_images: gallery.length > 0 ? gallery : product.gallery_images,
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
