'use server';

import { createClient } from '@/lib/supabase/server'; // Certifique-se que este path está correto

// Função para gerar ID curto (ex: K9P-2X4)
function generateShortId() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 6; i++) {
    if (i === 3) result += '-';
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function saveCartAction(cartItems: any[]) {
  // Importante: Criamos o cliente. Como é uma ação pública, ele usará a role 'anon'
  const ensureSupabaseEnv = () => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      // eslint-disable-next-line no-console
      console.error(
        'Faltam variáveis de ambiente Supabase: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
      throw new Error(
        'Configuração inválida: verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
    }
  };

  ensureSupabaseEnv();
  const supabase = await createClient();
  try {
    console.log(
      'saveCartAction called. cartItems length:',
      Array.isArray(cartItems) ? cartItems.length : 'invalid'
    );

    // 1. Validação Básica
    if (!cartItems || cartItems.length === 0) {
      console.log('saveCartAction: empty cart');
      return { success: false, error: 'O carrinho está vazio.' };
    }

    // 2. Gerar ID único
    let shortId = generateShortId();
    let attempts = 0;

    // Loop de segurança para garantir unicidade
    while (attempts < 3) {
      const { data: exists } = await supabase
        .from('saved_carts')
        .select('id')
        .eq('short_id', shortId)
        .limit(1)
        .maybeSingle();

      if (!exists) break; // ID livre

      shortId = generateShortId();
      attempts++;
    }

    // 3. Inserir no Banco
    console.log('Tentando salvar carrinho com ID:', shortId); // Log para debug

    const { data: inserted, error } = await supabase
      .from('saved_carts')
      .insert({
        short_id: shortId,
        cart_items: cartItems, // O Supabase converte array JS para JSONB automaticamente
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      // Aqui veremos o erro real no terminal do VS Code
      console.error('ERRO FATAL NO SUPABASE:', error);
      return { success: false, error: 'Erro ao salvar no banco de dados.' };
    }

    console.log('saveCartAction: inserted row:', inserted);
    const result = { success: true, shortId };
    console.log('saveCartAction returning:', result);
    return result;
  } catch (err) {
    console.error('ERRO INESPERADO:', err);
    return { success: false, error: 'Erro interno no servidor.' };
  }
}

export async function loadCartAction(shortId: string) {
  const ensureSupabaseEnv = () => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      // eslint-disable-next-line no-console
      console.error(
        'Faltam variáveis de ambiente Supabase: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
      throw new Error(
        'Configuração inválida: verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
    }
  };

  ensureSupabaseEnv();
  const supabase = await createClient();

  try {
    const formattedId = shortId.toUpperCase().trim();

    const { data, error } = await supabase
      .from('saved_carts')
      .select('cart_items')
      .eq('short_id', formattedId)
      .single();

    if (error || !data) {
      console.error('Erro ao buscar:', error);
      return { success: false, error: 'Orçamento não encontrado.' };
    }

    return { success: true, cartItems: data.cart_items };
  } catch (err) {
    return { success: false, error: 'Erro ao processar busca.' };
  }
}
