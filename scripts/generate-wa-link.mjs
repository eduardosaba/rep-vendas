function normalizePhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
}

function buildMessage({ customer, items, total, display_id, id, pdf_url }) {
  let msg = `*📦 NOVO PEDIDO: #${display_id || id}*\n`;
  msg += `--------------------------------\n\n`;
  msg += `*CLIENTE:* ${customer.name}\n`;
  msg += `*WHATSAPP:* ${customer.phone}\n\n`;
  msg += `*ITENS:*\n`;
  items.slice(0, 10).forEach((i) => (msg += `▪️ ${i.quantity}x ${i.name}\n`));
  if (items.length > 10) msg += `_...e outros ${items.length - 10} itens._\n`;
  msg += `\n*TOTAL: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}*\n`;
  if (pdf_url) msg += `\n*📄 COMPROVANTE PDF:*\n${pdf_url}\n`;
  msg += `\n_Gerado por RepVendas SaaS_`;
  return msg;
}

const examples = [
  {
    name: 'Caso 1 - representante definido',
    storePhone: '+55 (11) 99988-7766',
    representativePhone: '+55 11 87654-3210',
    order: {
      customer: { name: 'João Silva', phone: '+55 11 91234-5678' },
      items: [
        { quantity: 2, name: 'Camiseta Básica' },
        { quantity: 1, name: 'Short Jeans' },
      ],
      total: 259.9,
      pdf_url: 'https://cdn.example.com/pedidos/12345.pdf',
      display_id: '1024',
      id: 'order_abc_1',
    },
  },
  {
    name: 'Caso 2 - sem representante (fallback store.phone)',
    storePhone: '+55 21 99876-5432',
    representativePhone: null,
    order: {
      customer: { name: 'Maria Oliveira', phone: '+55 21 91111-2222' },
      items: [
        { quantity: 3, name: 'Caneca Personalizada' },
        { quantity: 5, name: 'Adesivo Logo' },
      ],
      total: 189.5,
      pdf_url: null,
      display_id: '2048',
      id: 'order_def_2',
    },
  },
];

for (const ex of examples) {
  const dest = ex.representativePhone || ex.storePhone || '';
  const phoneDigits = normalizePhone(dest);
  const msg = buildMessage(ex.order);
  const url = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(msg)}`;

  console.log('---');
  console.log(ex.name);
  console.log('Destino (raw):', dest);
  console.log('Mensagem:');
  console.log(msg);
  console.log('WhatsApp URL:');
  console.log(url);
}
