'use client';

import React, { useState } from 'react';

interface Props {
  onUploadReady: (file: File) => void;
  defaultValue?: string | null;
}

export default function SmartImageUpload({
  onUploadReady,
  defaultValue,
}: Props) {
  const [preview, setPreview] = useState<string | null>(defaultValue || null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    onUploadReady(f);
  };

  return (
    <div className="space-y-2">
      <div className="w-full h-40 bg-white rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="preview"
            className="w-full h-full object-contain p-4"
          />
        ) : (
          <div className="text-slate-400">Nenhuma imagem</div>
        )}
      </div>
      <input type="file" accept="image/*" onChange={handleFile} />
    </div>
  );
}
