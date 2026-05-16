'use server';

import { createClient } from '@/lib/supabase/server';

const PLAN_PRICES: Record<string, { price: number; label: string; color: string }> = {
  'free': { price: 0, label: 'Plano Free', color: '#8B5CF6' },
  'Fundador': { price: 5000, label: 'Plano Fundador (R$ 50,00)', color: '#3B82F6' },
  'Premium': { price: 9700, label: 'Plano Premium (R$ 97,00)', color: '#10B981' },
  'Distribuidora': { price: 14990, label: 'Plano Distribuidora (R$ 149,90)', color: '#06447e' },
};

const DEFAULT_PLAN_PRICE = { price: 5000, label: 'Assinatura RepVendas (R$ 50,00)', color: '#3B82F6' };

async function getUserPlanId(userId: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: subscription } = await supabase.from('subscriptions').select('plan_id').eq('user_id', userId).maybeSingle();
    if (subscription?.plan_id) return subscription.plan_id;

    const { data: profile } = await supabase.from('profiles').select('plan_id').eq('id', userId).maybeSingle();
    return profile?.plan_id || null;
  } catch (error) {
    console.error('[getUserPlanId] Erro ao buscar plano:', error);
    return null;
  }
}

export async function gerarLinkPagamento(userData: { 
  id: string; 
  name: string; 
  email: string;
  plan_id?: string; 
}) {
  const url = 'https://api.checkout.infinitepay.io/links';
  
  let planId: string | null | undefined = userData.plan_id;
  if (!planId) {
    planId = await getUserPlanId(userData.id);
  }

  const planInfo = planId && PLAN_PRICES[planId] ? PLAN_PRICES[planId] : DEFAULT_PLAN_PRICE;

  if (planId === 'free') {
    console.warn(`[gerarLinkPagamento] Tentativa de cobrar usuário do plano FREE: ${userData.id}`);
    return null;
  }

  // --- PREPARAÇÃO DO PAYLOAD COM IDENTIFICAÇÃO ---
  const payload = {
    handle: "repvendas",
    redirect_url: "https://repvendas.com.br/dashboard/fatura/sucesso",
    webhook_url: "https://repvendas.com.br/api/webhooks/infinitepay",
    
    // Identificação visual na listagem da InfinitePay
    order_id: `${userData.name.substring(0, 20)} - ${planId}`, 
    order_nsu: userData.id, 
    
    // Identificação do Cliente (Dados para o comprovante)
    customer: {
      name: userData.name,
      email: userData.email,
    },
    
    items: [
      {
        quantity: 1,
        price: planInfo.price,
        description: `${planInfo.label} - RepVendas`
      }
    ],

    // Alguns endpoints da InfinitePay usam campos extras para metadados
    metadata: {
      user_id: userData.id,
      customer_name: userData.name
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorDetail = await response.text();
      console.error("[gerarLinkPagamento] Erro INFINITEPAY:", errorDetail);
      return null;
    }

    const data = await response.json();
    return data.url; 

  } catch (error) {
    console.error("[gerarLinkPagamento] ERRO NA CHAMADA:", error);
    return null;
  }
}