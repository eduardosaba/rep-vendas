'use client';

import { useState } from 'react';
import { Save, Trash2, X } from 'lucide-react';

interface StagingProductCardProps {
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
}: StagingProductCardProps) {
  const [saving, setSaving] = useState(false);

  // Estado local do formulário
  const [formData, setFormData] = useState({
    name: originalName.split('.').slice(0, -1).join('.'), // Remove extensão .jpg para sugestão
    price: '',
    reference: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Máscara simples para preço (permite apenas números e vírgula/ponto)
    if (name === 'price') {
      const cleanValue = value.replace(/[^0-9.,]/g, '');
      setFormData((prev) => ({ ...prev, [name]: cleanValue }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveClick = async () => {
    if (!formData.name || !formData.price || !formData.reference) {
      alert('Preencha todos os campos obrigatórios'); // Pode usar toast aqui se preferir
      return;
    }

    setSaving(true);
    await onSave(id, formData);
    setSaving(false);
  };

  return (
    <div className="group relative flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Botão de Excluir Rápido (Canto Superior) */}
      <button
        onClick={() => onDelete(id)}
        className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur text-gray-400 hover:text-red-500 rounded-full shadow-sm z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Descartar imagem"
      >
        <X size={16} />
      </button>

      {/* Imagem (Preview) */}
      <div className="h-48 w-full bg-gray-100 relative overflow-hidden">
        <img
          src={imageUrl}
          alt="Preview"
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
      </div>

      {/* Formulário */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase">
            Nome do Produto
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Ex: Tênis Runner"
            className="w-full mt-1 border-b border-gray-200 py-1 text-sm font-medium focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">
              Referência
            </label>
            <input
              type="text"
              name="reference"
              value={formData.reference}
              onChange={handleChange}
              placeholder="SKU-123"
              className="w-full mt-1 border-b border-gray-200 py-1 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">
              Preço (R$)
            </label>
            <input
              type="text"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="0,00"
              className="w-full mt-1 border-b border-gray-200 py-1 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Ações */}
        <div className="mt-auto pt-4 flex items-center gap-2">
          <button
            onClick={() => onDelete(id)}
            className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
            title="Descartar"
          >
            <Trash2 size={18} />
          </button>

          <button
            onClick={handleSaveClick}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save size={16} />
                Salvar Produto
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
