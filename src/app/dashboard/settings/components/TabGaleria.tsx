import React, { useMemo, useState } from 'react';
import { Images, Loader2, Trash2, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const MAX_GALLERY_IMAGES = 12;

type TabGaleriaProps = {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  supabase: any;
};

export function TabGaleria({ formData, setFormData, supabase }: TabGaleriaProps) {
  const [uploading, setUploading] = useState(false);

  const gallery = useMemo(
    () => (Array.isArray(formData?.gallery_urls) ? formData.gallery_urls : []),
    [formData?.gallery_urls]
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = MAX_GALLERY_IMAGES - gallery.length;
    if (remaining <= 0) {
      toast.error(`Limite de ${MAX_GALLERY_IMAGES} imagens atingido.`);
      e.target.value = '';
      return;
    }

    const selected = Array.from(files).slice(0, remaining);
    if (selected.length < files.length) {
      toast.warning(`Apenas ${selected.length} imagem(ns) foram adicionadas por causa do limite de ${MAX_GALLERY_IMAGES}.`);
    }

    setUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const uploadedUrls: string[] = [];
      for (let i = 0; i < selected.length; i++) {
        const file = selected[i];
        const fileExt = (file.name.split('.').pop() || 'webp').toLowerCase();
        const fileName = `gallery-${Date.now()}-${i}.${fileExt}`;
        const filePath = `${user.id}/gallery/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
        if (data?.publicUrl) uploadedUrls.push(data.publicUrl);
      }

      const nextGallery = [...gallery, ...uploadedUrls].slice(0, MAX_GALLERY_IMAGES);
      setFormData((prev: any) => ({ ...prev, gallery_urls: nextGallery }));
      toast.success(`${uploadedUrls.length} imagem(ns) adicionada(s). Clique em "Salvar Aba Atual" para persistir.`);
    } catch (error: any) {
      toast.error(`Erro ao enviar imagens: ${error?.message || String(error)}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (indexToRemove: number) => {
    const filtered = gallery.filter((_: string, index: number) => index !== indexToRemove);
    setFormData((prev: any) => ({ ...prev, gallery_urls: filtered }));
  };

  const moveImage = (index: number, direction: 'left' | 'right') => {
    const to = direction === 'left' ? index - 1 : index + 1;
    if (to < 0 || to >= gallery.length) return;
    const next = [...gallery];
    const [item] = next.splice(index, 1);
    next.splice(to, 0, item);
    setFormData((prev: any) => ({ ...prev, gallery_urls: next }));
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-gray-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Images size={18} /> Galeria de Estilo
          </h3>

          <label className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase cursor-pointer flex items-center gap-2 ${uploading ? 'bg-slate-500 text-white' : 'bg-slate-900 text-white hover:bg-primary'}`}>
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? 'Enviando...' : 'Adicionar Fotos'}
            <input
              type="file"
              className="hidden"
              multiple
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400">Título da Galeria (exibido no frontend)</label>
            <input
              type="text"
              value={formData?.gallery_title || ''}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, gallery_title: e.target.value }))}
              className="w-full p-2 rounded-xl border-slate-200"
              placeholder="Ex: Lifestyle"
            />

            <label className="text-[10px] font-black uppercase text-slate-400">Subtítulo da Galeria</label>
            <input
              type="text"
              value={formData?.gallery_subtitle || ''}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, gallery_subtitle: e.target.value }))}
              className="w-full p-2 rounded-xl border-slate-200"
              placeholder="Ex: Veja nossos produtos em uso"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400">Cor do Título</label>
            <input
              type="color"
              value={formData?.gallery_title_color || '#111827'}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, gallery_title_color: e.target.value }))}
              className="w-full h-10 rounded-lg"
            />

            <label className="text-[10px] font-black uppercase text-slate-400">Cor do Subtítulo</label>
            <input
              type="color"
              value={formData?.gallery_subtitle_color || '#6b7280'}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, gallery_subtitle_color: e.target.value }))}
              className="w-full h-10 rounded-lg"
            />
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Até {MAX_GALLERY_IMAGES} imagens. Esta galeria aparece no final do catálogo institucional e do catálogo dos representantes vinculados.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {gallery.map((url: string, index: number) => (
            <div key={`${url}-${index}`} className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Galeria ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <button
                type="button"
                onClick={() => moveImage(index, 'left')}
                disabled={index === 0}
                className={`absolute left-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full bg-white text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity ${index === 0 ? 'opacity-40 pointer-events-none' : ''}`}
                aria-label="Mover para esquerda"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                type="button"
                onClick={() => moveImage(index, 'right')}
                disabled={index === gallery.length - 1}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full bg-white text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity ${index === gallery.length - 1 ? 'opacity-40 pointer-events-none' : ''}`}
                aria-label="Mover para direita"
              >
                <ChevronRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remover imagem"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          {gallery.length === 0 && (
            <div className="col-span-full border-2 border-dashed border-slate-200 rounded-2xl py-10 text-center text-sm text-slate-500">
              Nenhuma imagem na galeria. Adicione fotos lifestyle para enriquecer o catálogo.
            </div>
          )}
        </div>
        {/* Preview mockup */}
        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
          <h4 className="text-sm font-black mb-2">Pré-visualização da Galeria</h4>
          <div className="border rounded-lg p-4 bg-white flex flex-col md:flex-row items-start gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-black" style={{ color: formData?.gallery_title_color || '#111827' }}>{formData?.gallery_title || 'Título da Galeria'}</h3>
              <p className="text-sm text-slate-500" style={{ color: formData?.gallery_subtitle_color || '#6b7280' }}>{formData?.gallery_subtitle || 'Subtítulo da galeria'} </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {(gallery.slice(0,6)).map((u: string, i: number) => (
                  <div key={i} className="aspect-square rounded-md overflow-hidden bg-slate-100">
                    <img src={u} alt={`Preview ${i}`} className="w-full h-full object-cover" />
                  </div>
                ))}
                {gallery.length === 0 && (
                  <div className="col-span-full text-sm text-slate-400">Sem imagens — adicione para ver a pré-visualização</div>
                )}
              </div>
            </div>
            <div className="w-40 text-xs text-slate-500">
              Esta pré-visualização mostra como o título/subtítulo e as cores aparecem no frontend.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
