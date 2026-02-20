'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Save, Trash2, X, Search } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { buildSupabaseImageUrl } from '@/lib/imageUtils';

interface StagingProductCardProps {
  id: string;
  imageUrl: any;
  originalName: string;
  onSave: (
    id: string,
    data: { name: string; price: string; reference: string },
    productId?: string | null
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
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const supabase = createClient();

  const derivePreviewUrl = (src: any): string | null => {
    if (!src) return null;
    if (typeof src === 'string') return src;
    // object shapes:
    // { url: '...'}
    if (typeof src.url === 'string') return src.url;
    // { url480: '...', url1200: '...'}
    if (typeof src.url480 === 'string') return src.url480;
    if (typeof src.url1200 === 'string') return src.url1200;
    // { variants: [{size:480,url:...}, {size:1200,url:...}] }
    if (Array.isArray(src.variants)) {
      const v480 = src.variants.find((v: any) => v.size === 480);
      if (v480?.url) return v480.url;
      const v1200 = src.variants.find((v: any) => v.size === 1200);
      if (v1200?.url) return v1200.url;
    }
    // fallback fields
    if (typeof src.publicUrl === 'string') return src.publicUrl;
    return null;
  };

  const [previewSrc, setPreviewSrc] = useState<string | null>(derivePreviewUrl(imageUrl));
  const [thumbSrc, setThumbSrc] = useState<string | null>(null);

  useEffect(() => {
    setPreviewSrc(derivePreviewUrl(imageUrl));
  }, [imageUrl]);

  useEffect(() => {
    if (!previewSrc) {
      setThumbSrc('/placeholder.png');
      return;
    }

    // If it's a storage path (not full URL), build public URL
    let full = previewSrc;
    if (!/^https?:\/\//i.test(previewSrc)) {
      const built = buildSupabaseImageUrl(previewSrc as any);
      full = built || previewSrc;
    }

    // Prefer explicit -480w variant if present or convertible from -1200w
    if (/-1200w(\.|$)/.test(full)) {
      const alt = full.replace(/-1200w(\.[a-zA-Z0-9]+)?$/, '-480w$1');
      setThumbSrc(alt);
      return;
    }

    // If already has -480w, use as-is
    if (/-480w(\.|$)/.test(full)) {
      setThumbSrc(full);
      return;
    }

    // Otherwise proxy and resize to 480w for consistent thumbnails
    setThumbSrc(`/api/proxy-image?url=${encodeURIComponent(full)}&w=480&format=webp&q=70`);
  }, [previewSrc]);

  useEffect(() => {
    if (!productQuery || productQuery.length < 2) {
      setProductResults([]);
      return;
    }

    let mounted = true;
    const timer = setTimeout(async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const q = productQuery.trim();
        const { data } = await supabase
          .from('products')
          .select('id, name, reference_code, image_url')
          .eq('user_id', user.id)
          .or(`reference_code.ilike.%${q}%,name.ilike.%${q}%`)
          .limit(10);
        if (mounted) setProductResults(data || []);
      } catch (e) {
        // ignore search errors
      }
    }, 300);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [productQuery, supabase]);

  // Estado local do formulário
  const [formData, setFormData] = useState({
    name: originalName.split('.').slice(0, -1).join('.'), // Remove extensão .jpg para sugestão
    price: '',
    // Extrai a referência do nome do arquivo (ex: "RB3025.jpg" vira "RB3025")
    reference: originalName.split('.').slice(0, -1).join('.').toUpperCase(),
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
      toast.error('Campos obrigatórios', {
        description: 'Preencha todos os campos obrigatórios antes de salvar.',
      });
      return;
    }

    setSaving(true);
    await onSave(id, formData, selectedProductId ?? undefined);
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

      {/* Imagem (Preview) - Ajustada para carregar sempre */}
      <div className="h-40 md:h-48 w-full bg-slate-50 relative overflow-hidden flex items-center justify-center">
        {thumbSrc ? (
          <Image
            src={thumbSrc}
            alt="Preview"
            fill
            unoptimized // evita processamento do Next.js para imagens recém-enviadas
            sizes="(max-width: 768px) 100vw, 250px"
            className="transition-transform group-hover:scale-105 p-2"
            style={{ objectFit: 'contain' }} // mostra a imagem inteira
            loading="eager"
            priority
            onError={() => setThumbSrc('/placeholder.png')}
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-sm text-gray-400">
            Imagem indisponível
          </div>
        )}
      </div>

      {/* Formulário */}
      <div className="p-3 sm:p-4 flex flex-col gap-3 flex-1">
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
            className="w-full mt-1 border-b border-gray-200 py-1 text-sm font-medium focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              className="w-full mt-1 border-b border-gray-200 py-1 text-sm focus:border-primary focus:outline-none transition-colors"
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
              className="w-full mt-1 border-b border-gray-200 py-1 text-sm focus:border-primary focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Seletor de produto existente (opcional) */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase">Vincular a Produto Existente (opcional)</label>
          <div className="mt-1 relative">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={productQuery}
                onChange={(e) => {
                  setProductQuery(e.target.value);
                  setSelectedProductId(null);
                }}
                placeholder="Pesquisar por referência ou nome..."
                className="w-full py-1 text-sm border-b border-gray-200 focus:outline-none"
              />
              <div className="p-1 text-gray-400">
                <Search size={14} />
              </div>
            </div>

            {productResults.length > 0 && (
              <div className="absolute left-0 right-0 bg-white border mt-2 rounded-lg shadow-md z-20 max-h-40 overflow-y-auto">
                {productResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProductId(p.id);
                      setProductQuery(`${p.reference_code || ''} ${p.name || ''}`.trim());
                      setProductResults([]);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm border-b last:border-0 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded bg-gray-100 overflow-hidden flex-shrink-0 relative">
                      <img
                        src={
                          typeof p.image_url === 'string'
                            ? p.image_url
                            : p.image_url?.url || p.image_url?.publicUrl || '/placeholder.png'
                        }
                        className="w-full h-full object-cover"
                        alt={p.name || ''}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate text-indigo-600">{p.reference_code}</div>
                      <div className="text-[10px] text-slate-500 truncate">{p.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedProductId && (
              <div className="mt-2 text-[11px] text-emerald-600 font-bold">Produto selecionado</div>
            )}
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
            className="rv-btn-primary flex-1 flex items-center justify-center gap-2 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="inline-flex items-center gap-2">
                <Save size={16} />
                <span>Salvar Produto</span>
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
