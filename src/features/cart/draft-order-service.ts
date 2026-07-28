'use server'

import { createClient } from '@/lib/supabase/server';
import { revalidateTag } from 'next/cache';
import { DraftOrder, DraftOrderItem } from './cart-types';
import { computeAndPersistCommercialPricing } from '../pricing/services/pricing-service';
import { DraftOrderEventType } from '../pricing/pricing-types';

export async function getOrCreateActiveDraft(): Promise<{ success: boolean; data?: any; error?: string }> {
  const supabase = await createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Sessão expirada.' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, company_id')
      .eq('id', user.id)
      .single();

    if (!profile) return { success: false, error: 'Perfil não localizado.' };

    const { data: existingDraft } = await supabase
      .from('draft_orders')
      .select('*')
      .eq('created_by', user.id)
      .eq('status', 'draft')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingDraft) {
      return { success: true, data: existingDraft };
    }

    const { data: newDraft, error: createError } = await supabase
      .from('draft_orders')
      .insert({
        organization_id: profile.organization_id,
        company_id: profile.company_id,
        created_by: user.id,
        status: 'draft',
        total_items: 0,
        total_value: 0
      })
      .select('*')
      .single();

    if (createError) throw createError;

    return { success: true, data: newDraft };
  } catch (error: any) {
    console.error('[Draft Service - getOrCreateActiveDraft Exception]:', error.message);
    return { success: false, error: 'Falha ao gerenciar sessão de pré-venda persistente.' };
  }
}

export async function getActiveDraftWithItems() {
  const supabase = await createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Sessão expirada.' };

    const { data: existingDraft } = await supabase
      .from('draft_orders')
      .select('*, items:draft_order_items(*, product:products(*))')
      .eq('created_by', user.id)
      .eq('status', 'draft')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!existingDraft) {
      return { success: true, data: { draft: null, items: [] } };
    }

    return { success: true, data: { draft: existingDraft, items: existingDraft.items } };
  } catch (error: any) {
    return { success: false, error: 'Falha ao buscar detalhes do rascunho.' };
  }
}

interface AddItemInput {
  productId: string;
  quantity?: number;
}

export async function addItemToDraft(input: AddItemInput) {
  const supabase = await createClient();
  try {
    const draftResult = await getOrCreateActiveDraft();
    if (!draftResult.success || !draftResult.data) {
      return { success: false, error: draftResult.error };
    }

    const draftId = draftResult.data.id;
    const quantity = input.quantity || 1;

    const { error: itemError } = await supabase.rpc('add_item_to_draft', {
      p_draft_id: draftId,
      p_product_id: input.productId,
      p_quantity: quantity
    });

    if (itemError) {
      console.error('[Draft Service - Add RPC Error]:', itemError);
      throw itemError;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await computeAndPersistCommercialPricing(
        draftId, 
        user.id, 
        DraftOrderEventType.ADD_ITEM, 
        { productId: input.productId, quantity }
      );
    }

    revalidateTag('draft-cart');
    return { success: true };
  } catch (error: any) {
    console.error('[Draft Service - addItemToDraft Exception]:', error.message);
    return { success: false, error: 'Erro ao consolidar item no rascunho.' };
  }
}

export async function updateItemQuantity(itemId: string, quantity: number) {
  const supabase = await createClient();
  try {
    const draftResult = await getOrCreateActiveDraft();
    if (!draftResult.success || !draftResult.data) return { success: false, error: draftResult.error };

    const { error: itemError } = await supabase.rpc('update_item_quantity_in_draft', {
      p_draft_id: draftResult.data.id,
      p_item_id: itemId,
      p_quantity: quantity
    });

    if (itemError) throw itemError;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await computeAndPersistCommercialPricing(
        draftResult.data.id, 
        user.id, 
        DraftOrderEventType.UPDATE_QUANTITY, 
        { itemId, quantity }
      );
    }

    revalidateTag('draft-cart');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'Erro ao atualizar quantidade.' };
  }
}

export async function removeItemFromDraft(itemId: string) {
  const supabase = await createClient();
  try {
    const draftResult = await getOrCreateActiveDraft();
    if (!draftResult.success || !draftResult.data) return { success: false, error: draftResult.error };

    const { error: itemError } = await supabase.rpc('remove_item_from_draft', {
      p_draft_id: draftResult.data.id,
      p_item_id: itemId
    });

    if (itemError) throw itemError;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await computeAndPersistCommercialPricing(
        draftResult.data.id, 
        user.id, 
        DraftOrderEventType.REMOVE_ITEM, 
        { itemId }
      );
    }

    revalidateTag('draft-cart');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'Erro ao remover item.' };
  }
}

export async function updateItemNotes(itemId: string, notes: string) {
  const supabase = await createClient();
  try {
    const draftResult = await getOrCreateActiveDraft();
    if (!draftResult.success || !draftResult.data) return { success: false, error: draftResult.error };

    const { error } = await supabase
      .from('draft_order_items')
      .update({ notes })
      .eq('id', itemId)
      .eq('draft_order_id', draftResult.data.id);

    if (error) throw error;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await computeAndPersistCommercialPricing(
        draftResult.data.id, 
        user.id, 
        DraftOrderEventType.UPDATE_NOTES, 
        { itemId, notes }
      );
    }

    revalidateTag('draft-cart');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'Erro ao salvar observação.' };
  }
}
