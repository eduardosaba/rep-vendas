'use server';

export async function gerarLinkPagamento(userData: { id: string; name: string; email: string }) {
  const url = 'https://api.checkout.infinitepay.io/links';
  
  const payload = {
    handle: "eduardo-saba", // Sua InfiniteTag
    redirect_url: "https://repvendas.com.br/dashboard/fatura/sucesso",
    webhook_url: "https://repvendas.com.br/api/webhooks/infinitepay",
    order_nsu: userData.id, // O ID do Supabase vira o rastreador do pagamento
    customer: {
      name: userData.name,
      email: userData.email,
    },
    items: [
      {
        quantity: 1,
        price: 5000, // R$ 50,00 (em centavos)
        description: "Assinatura Mensal RepVendas plano Fundador"
      }
    ]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[InfinitePay API Error]:", errorData);
      return null;
    }

    const data = await response.json();
    // A API retorna o link no campo 'url'
    return data.url || null; 

  } catch (error) {
    console.error("[Action Error]:", error);
    return null;
  }
}