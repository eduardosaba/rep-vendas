import { inngest } from './client';
import { createClient } from '@supabase/supabase-js';
import dns from 'node:dns';
import sharp from 'sharp';
import { copyImageToUser } from '@/lib/copyImageToUser';

if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');

// 1. Função que descobre quem precisa de sincronização
export const processFullCatalog = inngest.createFunction(
  { id: 'process-full-catalog' },
  { event: 'catalog/sync.requested' },
  async ({ event, step }) => {
    const { userId } = event.data;

    const products = await step.run('fetch-pending-products', async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data } = await supabase
        .from('products')
        .select('id, external_image_url')
        .eq('user_id', userId)
        .is('image_path', null);
      return data || [];
    });

    // Cria um job de sincronização para acompanhar progresso
    const jobId = await step.run('create-sync-job', async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data } = await supabase
        .from('sync_jobs')
        .upsert({
          user_id: userId,
          total_count: products.length,
          completed_count: 0,
          status: 'processing',
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      return data?.id;
    });

    // Dispara um evento individual para cada produto (Escalabilidade total)
    const events = products.map((p) => ({
      name: 'image/internalize.requested',
      data: {
        productId: p.id,
        externalUrl: p.external_image_url,
        userId,
        jobId,
      },
    }));

    await step.sendEvent('trigger-individual-syncs', events);

    return { count: products.length };
  }
);

// 2. Função que processa UMA única imagem (com retries automáticos)
export const internalizeSingleImage = inngest.createFunction(
  {
    id: 'internalize-single-image',
    throttle: { limit: 5, period: '1s' }, // Evita ser banido pela Safilo (5 por segundo)
  },
  { event: 'image/internalize.requested' },
  async ({ event, step }) => {
    const { productId, externalUrl, userId } = event.data;

    const jobId = event.data?.jobId;
    // Garantir que sempre reportamos progresso (success/failure) para o job
    try {
      await step.run('download-and-upload', async () => {
        // Lógica de download com os headers blindados que testamos
        const response = await fetch(externalUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0...',
            Referer: 'https://commportal.safilo.com/',
          },
        });

        if (!response.ok) throw new Error(`Status ${response.status}`);

        const buffer = Buffer.from(await response.arrayBuffer());
        const optimized = await sharp(buffer).resize(1200).jpeg().toBuffer();

        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const fileName = `public/${userId}/products/${productId}.jpg`;

        await supabase.storage
          .from('product-images')
          .upload(fileName, optimized, { upsert: true });
        await supabase
          .from('products')
          .update({ image_path: fileName })
          .eq('id', productId);
      });

      if (jobId) {
        await step.run('increment-progress', async () => {
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );
          await supabase.rpc('increment_sync_progress', {
            p_job_id: jobId,
            p_status: 'success',
            p_product_id: productId,
            p_error_text: null,
          });
        });
      }
    } catch (err: any) {
      // Reporta falha no job antes de rethrow para permitir retries
      if (jobId) {
        try {
          await step.run('increment-progress-failure', async () => {
            const supabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            await supabase.rpc('increment_sync_progress', {
              p_job_id: jobId,
              p_status: 'failed',
              p_product_id: productId,
              p_error_text: String(err?.message || err),
            });
          });
        } catch (reportErr) {
          // swallow reporting error to not mask original error
          console.error('Failed to report progress failure', reportErr);
        }
      }

      throw err;
    }
  }
);

// 3. Função Inngest para clonagem de catálogo solicitada
export const cloneCatalog = inngest.createFunction(
  { id: 'clone-catalog' },
  { event: 'catalog/clone.requested' },
  async ({ event, step }) => {
    const { source_user_id, target_user_id, brands } = event.data || {};

    if (!source_user_id || !target_user_id) {
      throw new Error('Missing source_user_id or target_user_id');
    }

    return await step.run('call-rpc-clone', async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data, error } = await supabase.rpc('clone_catalog_smart', {
        source_user_id,
        target_user_id,
        brands_to_copy: brands || null,
      });
      if (error) throw error;
      try {
        await supabase.from('activity_logs').insert({
          user_id: source_user_id,
          action_type: 'CLONE',
          description: `Clonagem processada (worker): ${Array.isArray(brands) ? brands.join(', ') : 'todas'} -> ${target_user_id}`,
          metadata: { source_user_id, target_user_id, brands },
        });
      } catch (logErr) {
        console.warn(
          'Failed to write activity log in worker cloneCatalog',
          logErr
        );
      }
      return data;
    });
  }
);

// 4. Função Inngest para copy-on-write de imagens quando o usuário edita a imagem
export const copyImageOnWrite = inngest.createFunction(
  { id: 'copy-image-on-write' },
  { event: 'image/copy_on_write.requested' },
  async ({ event, step }) => {
    const { sourcePath, targetUserId, productId } = event.data || {};
    if (!sourcePath || !targetUserId || !productId) {
      throw new Error('Missing parameters for copy-on-write');
    }

    return await step.run('do-copy', async () => {
      // copyImageToUser will update the product row to point to user's copy
      const result = await copyImageToUser({
        sourcePath,
        targetUserId,
        productId,
      });
      return result;
    });
  }
);

// 5. Função de CRON para processar imagens da Galeria (product_images)
export const processPendingImages = inngest.createFunction(
  { id: 'process-pending-images' },
  { cron: '*/5 * * * *' }, // A cada 5 minutos
  async ({ step }) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Buscar imagens pendentes (LIMIT 50)
    const imagesToProcess = await step.run('fetch-pending', async () => {
      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('sync_status', 'pending')
        .limit(50);

      if (error) throw error;
      return data || [];
    });

    if (imagesToProcess.length === 0) {
      return { message: 'Nenhuma imagem pendente.' };
    }

    // 2. Processar cada imagem
    const results = await Promise.all(
      imagesToProcess.map(async (img) => {
        return step.run(`process-${img.id}`, async () => {
          try {
            // Download
            const response = await fetch(img.url, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                Referer: 'https://commportal.safilo.com/',
              },
            });

            if (!response.ok) {
              await supabase
                .from('product_images')
                .update({
                  sync_status: 'failed',
                  sync_error: `HTTP ${response.status}`,
                })
                .eq('id', img.id);
              return { id: img.id, status: 'failed' };
            }

            const buffer = Buffer.from(await response.arrayBuffer());

            // Configuração das versões (Estratégia de Múltiplas Versões)
            const VERSIONS = [
              { suffix: 'small', width: 200, quality: 70 },
              { suffix: 'medium', width: 600, quality: 80 },
              { suffix: 'large', width: 1200, quality: 85 },
            ];

            // Gerar e enviar as 3 versões
            for (const version of VERSIONS) {
              const optimizedBuffer = await sharp(buffer)
                .resize(version.width, version.width, {
                  fit: 'inside',
                  withoutEnlargement: true,
                })
                .webp({ quality: version.quality })
                .toBuffer();

              const fileName = `public/${img.product_id}/${img.id}-${version.suffix}.webp`;
              const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(fileName, optimizedBuffer, {
                  contentType: 'image/webp',
                  upsert: true,
                });

              if (uploadError) throw uploadError;
            }

            // Pegamos a URL da versão "medium" como padrão
            const fileName = `public/${img.product_id}/${img.id}-medium.webp`;
            const {
              data: { publicUrl },
            } = supabase.storage.from('product-images').getPublicUrl(fileName);

            // Update DB
            await supabase
              .from('product_images')
              .update({
                url: publicUrl,
                sync_status: 'synced',
                sync_error: null,
              })
              .eq('id', img.id);

            return { id: img.id, status: 'success' };
          } catch (err: any) {
            await supabase
              .from('product_images')
              .update({ sync_status: 'failed', sync_error: err.message })
              .eq('id', img.id);
            return { id: img.id, status: 'failed', error: err.message };
          }
        });
      })
    );

    return { processed: results.length };
  }
);
