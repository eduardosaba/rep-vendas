'use client';

import { useState } from 'react';
import Router from 'next/router';

type Item = {
  product_name: string;
  product_reference?: string;
  quantity: number;
  unit_price: number;
};

export default function ManualOrderForm({ onClose }: { onClose: () => void }) {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerDocument, setCustomerDocument] = useState('');
  const [items, setItems] = useState<Item[]>([
    { product_name: '', product_reference: '', quantity: 1, unit_price: 0 },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addItem = () => {
    setItems((s) => [
      ...s,
      { product_name: '', product_reference: '', quantity: 1, unit_price: 0 },
    ]);
  };

  const removeItem = (idx: number) => {
    setItems((s) => s.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, patch: Partial<Item>) => {
    setItems((s) => s.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const payload = {
      customer: {
        name: customerName,
        email: customerEmail || null,
        phone: customerPhone || null,
        document: customerDocument || null,
      },
      items: items.map((it) => ({
        product_name: it.product_name,
        product_reference: it.product_reference || null,
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unit_price) || 0,
      })),
    };

    try {
      const res = await fetch('/api/manual-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      // Redirect to the created order page (uses display_id)
      if (data?.display_id) {
        window.location.href = `/dashboard/orders/${data.display_id}`;
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar pedido');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-2xl bg-white rounded-lg p-6 shadow-lg"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Criar Pedido Manual</h3>
          <button type="button" onClick={onClose} className="text-gray-500">
            Fechar
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <label className="text-xs text-gray-500">Nome do Cliente</label>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
            className="w-full p-2 border rounded"
          />

          <label className="text-xs text-gray-500">Email</label>
          <input
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            className="w-full p-2 border rounded"
          />

          <label className="text-xs text-gray-500">Telefone</label>
          <input
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="w-full p-2 border rounded"
          />

          <label className="text-xs text-gray-500">CPF / CNPJ</label>
          <input
            value={customerDocument}
            onChange={(e) => setCustomerDocument(e.target.value)}
            className="w-full p-2 border rounded font-mono"
          />
        </div>

        <div className="mt-4">
          <h4 className="font-medium mb-2">Itens</h4>
          <div className="space-y-3">
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <input
                  className="col-span-5 p-2 border rounded"
                  placeholder="Nome do produto"
                  value={it.product_name}
                  onChange={(e) =>
                    updateItem(idx, { product_name: e.target.value })
                  }
                  required
                />
                <input
                  className="col-span-2 p-2 border rounded font-mono"
                  placeholder="Ref"
                  value={it.product_reference || ''}
                  onChange={(e) =>
                    updateItem(idx, { product_reference: e.target.value })
                  }
                />
                <input
                  type="number"
                  className="col-span-2 p-2 border rounded"
                  value={it.quantity}
                  min={1}
                  onChange={(e) =>
                    updateItem(idx, { quantity: Number(e.target.value) })
                  }
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  className="col-span-2 p-2 border rounded"
                  value={it.unit_price}
                  onChange={(e) =>
                    updateItem(idx, { unit_price: Number(e.target.value) })
                  }
                  required
                />
                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="text-red-500"
                  >
                    Rem
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={addItem}
              className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded"
            >
              Adicionar Item
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 bg-indigo-600 text-white rounded"
          >
            {isSaving ? 'Salvando...' : 'Criar Pedido'}
          </button>
        </div>
      </form>
    </div>
  );
}
