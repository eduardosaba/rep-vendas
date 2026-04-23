 'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createSvcClient } from '@supabase/supabase-js';
import { deleteImageIfUnused } from '@/lib/storage';
import { revalidatePath } from 'next/cache';

// Atualiza campos simples (Tags, Status)
export async function bulkUpdateFields(ids: string[], data: any) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      console.error('[BulkUpdate] auth error', userErr);
      return { error: 'Usuário não autenticado.' } as any;
    }

    // --- MAPEAMENTO DE SEGURANÇA ---
    const mappedData: Record<string, any> = {};

    if (data.is_launch !== undefined) mappedData.is_launch = data.is_launch;
    if (data.is_active !== undefined) mappedData.is_active = data.is_active;
    if (data.is_destaque !== undefined) mappedData.is_destaque = data.is_destaque;

    if (data.is_best_seller !== undefined) {
      mappedData.is_best_seller = data.is_best_seller;
      mappedData.bestseller = data.is_best_seller;
    }

    if (data.brand !== undefined) mappedData.brand = data.brand;
    if (data.category !== undefined) mappedData.category = data.category;

    console.log('[BulkUpdate] Mapped Data for DB:', mappedData);

    if (Object.keys(mappedData).length === 0) {
      console.warn('[BulkUpdate] No mapped fields to update, aborting');
      return { error: 'Nenhum campo editável fornecido' } as any;
    }

    const { error } = await supabase
      .from('products')
      .update(mappedData)
      .in('id', ids)
      .eq('user_id', user.id);

    if (error) {
      console.error('[BulkUpdate] DB Error:', error);
      return { error: `Erro no banco: ${error.message || JSON.stringify(error)}` } as any;
    }

    revalidatePath('/dashboard/products');
    return { success: true } as any;
  } catch (err: any) {
    console.error('[BulkUpdate] Critical Error:', err);
    return { error: 'Falha interna ao processar atualização.' } as any;
  }
}

// Atualização Inteligente de Preço (Fixo ou Porcentagem)
export async function bulkUpdatePrice(
  ids: string[],
  mode: 'fixed' | 'percentage',
  value: number
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) return { error: 'Não autenticado' } as any;

    if (mode === 'fixed') {
      const { error } = await supabase
        .from('products')
        .update({ cost: value })
        .in('id', ids)
        .eq('user_id', user.id);

      if (error) return { error: error.message } as any;
    } else {
      const { data: currentProducts, error } = await supabase
        .from('products')
        .select('id, cost')
        .in('id', ids)
        .eq('user_id', user.id);

      if (error) return { error: error.message } as any;
      if (currentProducts) {
        const updates = currentProducts.map((prod: any) => {
          const newPrice = (prod.cost || 0) * (1 + value / 100);
          return supabase
            .from('products')
            .update({ cost: newPrice })
            .eq('id', prod.id)
            .eq('user_id', user.id);
        });
        await Promise.all(updates);
      }
    }

    revalidatePath('/dashboard/products');
    return { success: true } as any;
  } catch (err: any) {
    console.error('[bulkUpdatePrice] error', err);
    return { error: err?.message || 'Falha ao atualizar preços' } as any;
  }
}

// Exclusão em Massa
export async function bulkDelete(
  ids: string[],
  opts?: { preferSoft?: boolean; scope?: 'mine' | 'all' }
) {
  const supabase = await createClient();

  // Ensure user is authenticated
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) throw new Error(userErr.message || 'auth_error');
  if (!user) throw new Error('not_authenticated');

  // Check profile role to decide authorization
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  // If master, use service role to perform a global delete (bypass RLS).
  const chunkSize = 200;

  const deletedIds: string[] = [];
  const softDeletedIds: string[] = [];

  const runDeleteChunk = async (
    client: any,
    chunkIds: string[],
    extraFilter?: { field: string; value: any }
  ) => {
    try {
      let query = client.from('products').delete().in('id', chunkIds);
      if (extraFilter) {
        query = query.eq(extraFilter.field, extraFilter.value);
      }
      // IMPORTANTE: Adicionar .select() para retornar os IDs deletados
      query = query.select('id');
      const { data, error } = await query;
      if (error) throw error;

      if (Array.isArray(data)) {
        data.forEach((r: any) => {
          if (r && r.id) deletedIds.push(r.id);
        });
      }
      return;
    } catch (err: any) {
      // Log full error for easier debugging in server logs

      console.error('[bulkDelete] chunk delete error', {
        message: err?.message || String(err),
        code: err?.code,
        detail: err?.details,
        hint: err?.hint,
        chunkSize: chunkIds.length,
        sampleIds: chunkIds.slice(0, 5),
      });

      // Detect foreign-key/constraint errors (Postgres code 23503) or messages
      const isFkError =
        err?.code === '23503' ||
        /foreign key constraint|violates foreign key|referential integrity/i.test(
          String(err?.message || '')
        );

      if (isFkError) {
        // Attempt soft-delete: marcar como inativo para preservar integridade
        try {
          console.info(
            '[bulkDelete] attempting soft-delete for chunk due to FK constraint',
            {
              chunkSize: chunkIds.length,
              sampleIds: chunkIds.slice(0, 5),
            }
          );

          let upd = client
            .from('products')
            .update({ is_active: false })
            .in('id', chunkIds)
            .select('id');
          if (extraFilter) upd = upd.eq(extraFilter.field, extraFilter.value);
          const { data: upData, error: upErr } = await upd;
          if (upErr) {
            console.error('[bulkDelete] soft-delete failed', {
              message: upErr?.message || String(upErr),
            });
            throw upErr;
          }

          if (Array.isArray(upData)) {
            upData.forEach((r: any) => {
              if (r && r.id) softDeletedIds.push(r.id);
            });
          }

          // soft-delete succeeded; return without throwing
          return;
        } catch (softErr) {
          // If soft-delete fails, rethrow the original or soft-delete error
          throw softErr || err;
        }
      }

      throw err;
    }
  };

  if (profile?.role === 'master') {
    const SUPABASE_URL =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('missing_service_role_key');
    }

    const supabaseAdmin = createSvcClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      { global: { fetch } }
    );

    if (opts?.scope === 'mine') {
      // Master requested to delete only their own items: use normal client and restrict by user_id
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        if (opts?.preferSoft) {
          const { data: upData, error: upErr } = await supabase
            .from('products')
            .update({ is_active: false })
            .in('id', chunk)
            .eq('user_id', user.id)
            .select('id');
          if (upErr) throw upErr;
          if (Array.isArray(upData))
            (upData as any[]).forEach(
              (r: any) => r?.id && softDeletedIds.push(r.id)
            );
        } else {
          await runDeleteChunk(supabase, chunk, {
            field: 'user_id',
            value: user.id,
          });
        }
      }
    } else if (opts?.scope === 'all') {
      // master deleting globally
      if (opts?.preferSoft) {
        // prefer soft-delete globally
        for (let i = 0; i < ids.length; i += chunkSize) {
          const chunk = ids.slice(i, i + chunkSize);
          const { data: upData, error: upErr } = await supabaseAdmin
            .from('products')
            .update({ is_active: false })
            .in('id', chunk)
            .select('id');
          if (upErr) throw upErr;
          if (Array.isArray(upData))
            (upData as any[]).forEach(
              (r: any) => r?.id && softDeletedIds.push(r.id)
            );
        }
      } else {
        for (let i = 0; i < ids.length; i += chunkSize) {
          const chunk = ids.slice(i, i + chunkSize);

          // Antes de deletar os registros, removemos arquivos do Storage
          try {
            const { data: imgs } = await supabaseAdmin
              .from('products')
              .select('id, image_path, images')
              .in('id', chunk);

            const pathsToDelete: string[] = [];
            (imgs || []).forEach((p: any) => {
              if (p?.image_path)
                pathsToDelete.push(String(p.image_path).replace(/^\//, ''));
              if (p?.images && Array.isArray(p.images)) {
                p.images.forEach((img: any) => {
                  if (!img) return;
                  if (
                    typeof img === 'string' &&
                    img.includes('/product-images/')
                  ) {
                    pathsToDelete.push(img.split('/product-images/')[1]);
                  } else if (
                    typeof img === 'string' &&
                    !img.startsWith('http')
                  ) {
                    pathsToDelete.push(String(img).replace(/^\//, ''));
                  }
                });
              }
            });

            const uniquePaths = Array.from(new Set(pathsToDelete)).filter(
              Boolean
            );
            if (uniquePaths.length > 0) {
              // Remover arquivos de forma segura, verificando referências antes
              for (const path of uniquePaths) {
                const res = await deleteImageIfUnused(
                  supabaseAdmin,
                  'product-images',
                  path
                );
                if (!res.success) {
                  console.error(
                    '[bulkDelete] safe remove failed',
                    res.error,
                    path
                  );
                  throw new Error(
                    res.error || 'storage_remove_failed_for_product_images'
                  );
                }
              }
            }
          } catch (e) {
            console.error(
              '[bulkDelete] failed to fetch image paths before delete',
              e
            );
          }

          await runDeleteChunk(supabaseAdmin, chunk);
        }
      }
    } else {
      // default master behavior: global delete (backwards compatible)
      if (opts?.preferSoft) {
        // prefer soft-delete: update is_active = false in chunks
        for (let i = 0; i < ids.length; i += chunkSize) {
          const chunk = ids.slice(i, i + chunkSize);
          const { data: upData, error: upErr } = await supabaseAdmin
            .from('products')
            .update({ is_active: false })
            .in('id', chunk)
            .select('id');
          if (upErr) throw upErr;
          if (Array.isArray(upData))
            (upData as any[]).forEach(
              (r: any) => r?.id && softDeletedIds.push(r.id)
            );
        }
      } else {
        for (let i = 0; i < ids.length; i += chunkSize) {
          const chunk = ids.slice(i, i + chunkSize);

          // Antes de deletar os registros, removemos arquivos do Storage
          try {
            const { data: imgs } = await supabaseAdmin
              .from('products')
              .select('id, image_path, images')
              .in('id', chunk);

            const pathsToDelete: string[] = [];
            (imgs || []).forEach((p: any) => {
              if (p?.image_path)
                pathsToDelete.push(String(p.image_path).replace(/^\//, ''));
              if (p?.images && Array.isArray(p.images)) {
                p.images.forEach((img: any) => {
                  if (!img) return;
                  if (
                    typeof img === 'string' &&
                    img.includes('/product-images/')
                  ) {
                    pathsToDelete.push(img.split('/product-images/')[1]);
                  } else if (
                    typeof img === 'string' &&
                    !img.startsWith('http')
                  ) {
                    pathsToDelete.push(String(img).replace(/^\//, ''));
                  }
                });
              }
            });

            const uniquePaths = Array.from(new Set(pathsToDelete)).filter(
              Boolean
            );
            if (uniquePaths.length > 0) {
              // Remover arquivos de forma segura, verificando referências antes
              for (const path of uniquePaths) {
                const res = await deleteImageIfUnused(
                  supabaseAdmin,
                  'product-images',
                  path
                );
                if (!res.success) {
                  console.error(
                    '[bulkDelete] safe remove failed',
                    res.error,
                    path
                  );
                  throw new Error(
                    res.error || 'storage_remove_failed_for_product_images'
                  );
                }
              }
            }
          } catch (e) {
            console.error(
              '[bulkDelete] failed to fetch image paths before delete',
              e
            );
          }

          await runDeleteChunk(supabaseAdmin, chunk);
        }
      }
    }
  } else {
    // Non-master users can only delete their own products
    if (opts?.preferSoft) {
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const { data: upData, error: upErr } = await supabase
          .from('products')
          .update({ is_active: false })
          .in('id', chunk)
          .eq('user_id', user.id)
          .select('id');
        if (upErr) throw upErr;
        if (Array.isArray(upData))
          (upData as any[]).forEach(
            (r: any) => r?.id && softDeletedIds.push(r.id)
          );
      }
    } else {
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        await runDeleteChunk(supabase, chunk, {
          field: 'user_id',
          value: user.id,
        });
      }
    }
  }

  revalidatePath('/dashboard/products');
  return { success: true, deletedIds, softDeletedIds };
}
