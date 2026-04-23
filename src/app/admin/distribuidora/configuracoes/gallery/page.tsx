'use client';

import React, { useState, useEffect } from 'react';

export default function CompanyGalleryPage() {
  const [images, setImages] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // fetch existing gallery for the company (simple public endpoint could be added)
    const fetchGallery = async () => {
      try {
        const res = await fetch('/api/admin/company/gallery/list');
        const data = await res.json();
        if (data?.success) setImages(data.data || []);
      } catch (e) {}
    };
    fetchGallery();
  }, []);

  const handleUpload = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const files = ev.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', files[0]);
      fd.append('title', (files[0] as any).name);
      const res = await fetch('/api/admin/company/gallery/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data?.success) {
        setImages((s) => [data.data, ...s]);
      } else {
        alert('Erro: ' + (data?.error || ''));
      }
    } catch (e) {
      alert('Erro no upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black">Galeria de Mídia</h1>
          <p className="text-slate-500">Fotos de campanhas, showroom e materiais de apoio.</p>
        </div>
        <label className="bg-primary text-white h-12 px-6 rounded-2xl font-bold flex items-center gap-2 cursor-pointer">
          {uploading ? 'Carregando...' : 'Adicionar Foto'}
          <input type="file" multiple={false} accept="image/*" onChange={handleUpload} className="hidden" />
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {images.map((img) => (
          <div key={img.id} className="bg-white p-3 rounded-3xl border shadow-sm overflow-hidden aspect-square">
            <img src={img.image_url} alt={img.title} className="w-full h-full object-cover rounded-2xl" />
            <div className="p-2">
              <p className="text-xs font-bold truncate">{img.title}</p>
            </div>
          </div>
        ))}

        {images.length === 0 && (
          <div className="col-span-full text-center py-16 border-2 border-dashed rounded-3xl opacity-40">
            Nenhuma foto adicionada à galeria.
          </div>
        )}
      </div>
    </div>
  );
}
