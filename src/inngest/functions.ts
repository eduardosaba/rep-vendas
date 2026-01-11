import { inngest } from './client';
import { createClient } from '@supabase/supabase-js';
import dns from 'node:dns';
import sharp from 'sharp';

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
