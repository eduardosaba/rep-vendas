'use server';

import { createClient } from '@/lib/supabase/server';

const COST_PER_GENERATION = 1;

export async function generateProductDescription(product: {
  name: string;
  brand: string;
  category: string;
  specs: string;
}) {
  try {
    const supabase = await createClient();

    // 1. VERIFICAÇÃO GLOBAL (KILL SWITCH)
    const { data: config } = await supabase
      .from('platform_settings')
      .select('is_enabled')
      .eq('key', 'ai_description_generation')
      .maybeSingle();

    // Se não existir configuração ou estiver false, bloqueia
    if (!config || config.is_enabled === false) {
      return 'IA_DESATIVADA_PELO_ADMIN';
    }

    // 2. Validação de API Key
    if (!process.env.GEMINI_API_KEY)
      return 'Erro: Chave de API não configurada.';

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 'Erro: Usuário não autenticado.';

    // 3. CONTROLE DE CRÉDITOS
    const { data: success, error: creditError } = await supabase.rpc(
      'deduct_credits',
      {
        p_user_id: user.id,
        p_cost: COST_PER_GENERATION,
        p_description: `IA: Descrição para ${product.name}`,
      }
    );

    if (creditError) {
      console.error('Erro créditos:', creditError);
      return 'Erro ao processar créditos.';
    }

    if (!success) return 'SALDO_INSUFICIENTE';

    // 4. Geração
    // Tenta importar dinamicamente a biblioteca do Google Generative AI. Se não disponível,
    // retorna mensagem amigável ao usuário.
    let GoogleGenerativeAI: any = undefined;
    try {
      // uso de import dinâmico previne erro de compilação quando o pacote não estiver instalado
      const mod = await import('@google/generative-ai');
      GoogleGenerativeAI = mod?.GoogleGenerativeAI;
    } catch {
      // Falha silenciosa no import opcional
      GoogleGenerativeAI = undefined;
    }

    if (!GoogleGenerativeAI || !process.env.GEMINI_API_KEY) {
      return 'IA_NAO_DISPONIVEL';
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp', // Modelo mais recente e rápido
    });
    const prompt = `
      Atue como um Gerente Comercial Sênior.
      Crie um texto curto de "Dicas de Venda" para um representante comercial vender o seguinte produto:
      Produto: ${product.name}
      Marca: ${product.brand}
      Categoria: ${product.category}
      Detalhes Técnicos: ${product.specs}

      Saída:
      1. Um parágrafo curto e persuasivo.
      2. Três bullet points "Argumentos de Venda".
      Formato: Texto simples, Português BR.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Erro na IA:', error);
    return 'Erro ao gerar descrição. Tente novamente.';
  }
}
