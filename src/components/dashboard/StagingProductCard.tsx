'use client';

import { useState } from 'react';
import { Save, Trash2, Loader2 } from 'lucide-react';

interface Props {
  id: string;
  imageUrl: string;
  originalName: string;
  onSave: (
    id: string,
    data: { name: string; price: string; reference: string }
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function StagingProductCard({
  id,
  imageUrl,
  originalName,
  onSave,
  onDelete,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const initialRef = originalName.split('.').slice(0, -1).join('.');

  const [formData, setFormData] = useState({
    reference: initialRef,
    name: '',
    price: '',
  });

  const handleSave = async () => {
    if (!formData.reference || !formData.name || !formData.price) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }
    setSaving(true);
    try {
      await onSave(id, formData);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Descartar esta imagem?')) return;
    setDeleting(true);
    try {
      await onDelete(id);
    } finally {
      // onDelete is expected to remove the item from the parent; keep state consistent
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      <div className="relative h-48 bg-gray-100">
        <img
          src={imageUrl}
          alt="Preview"
          className="w-full h-full object-contain"
        />
        <button
          onClick={handleDelete}
          disabled={deleting || saving}
          className="absolute top-2 right-2 p-2 bg-white/90 text-red-600 rounded-full hover:bg-red-50 shadow-sm transition-colors"
          title="Descartar"
        >
          {deleting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Trash2 size={16} />
          )}
        </button>
      </div>

      <div className="p-4 space-y-3 flex-1 flex flex-col">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Referência (SKU) *
          </label>
          <input
            type="text"
            value={formData.reference}
            onChange={(e) =>
              setFormData({ ...formData, reference: e.target.value })
            }
            className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="REF-001"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Nome do Produto *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Ex: Tênis Esportivo"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Preço (R$) *
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) =>
              setFormData({ ...formData, price: e.target.value })
            }
            className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="0.00"
          />
        </div>

        <div className="mt-auto pt-2">
          <button
            onClick={handleSave}
            disabled={saving || deleting}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Salvar Produto
          </button>
        </div>
      </div>
    </div>
  );
}
