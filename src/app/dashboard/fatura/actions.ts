'use server';

export async function gerarLinkPagamento(userData: { id: string; name: string; email: string }) {
  const url = 'https://api.checkout.infinitepay.io/links';
  
  const payload = {
    handle: "repvendas", // <--- CONFIRME SE É EXATAMENTE ISSO
    redirect_url: "https://repvendas.com.br/dashboard/fatura/sucesso",
    webhook_url: "https://repvendas.com.br/api/webhooks/infinitepay",
    order_nsu: userData.id,
    customer: {
      name: userData.name,
      email: userData.email,
    },
    items: [
      {
        quantity: 1,
        price: 5000, 
        description: "Assinatura Mensal RepVendas Fundador"
      }
    ]
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
      // Isso vai imprimir o erro real no seu terminal do VS Code
      const errorDetail = await response.text();
      console.error("ERRO INFINITEPAY:", errorDetail);
      return null;
    }

    const data = await response.json();
    return data.url; 

  } catch (error) {
    console.error("ERRO NA CHAMADA:", error);
    return null;
  }
}