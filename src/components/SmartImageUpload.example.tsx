import React, { useState } from 'react';
import SmartImageUpload from './SmartImageUpload';

export default function SmartImageUploadExample() {
  const [fileInfo, setFileInfo] = useState<string | null>(null);

  const handleReady = (file: File | Blob) => {
    // Exemplo: enviar para Supabase Storage
    // const { data, error } = await supabase.storage.from('products').upload(`${userId}/${file.name}`, file, { upsert: true })
    setFileInfo(
      `Pronto para upload: ${'name' in file ? (file as File).name : 'blob'}`
    );
    console.log('Arquivo pronto para upload', file);
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-4">Exemplo SmartImageUpload</h2>
      <SmartImageUpload
        onUploadReady={handleReady}
        maxDimension={800}
        quality={0.8}
      />
      {fileInfo && <p className="mt-4 text-sm text-slate-600">{fileInfo}</p>}
    </div>
  );
}
