'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';

interface Props {
  onDrop: (files: File[]) => void;
  disabled?: boolean;
}

export function ImageDropzone({ onDrop, disabled }: Props) {
  const handleDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles?.length > 0) {
        onDrop(acceptedFiles);
      }
    },
    [onDrop]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
        ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center gap-4">
        <div
          className={`p-4 rounded-full ${isDragActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}
        >
          <UploadCloud size={32} />
        </div>
        <div>
          <p className="text-lg font-medium text-gray-900">
            {isDragActive
              ? 'Solte as fotos aqui...'
              : 'Arraste e solte suas fotos aqui'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            ou clique para selecionar do computador
          </p>
        </div>
        <p className="text-xs text-gray-400">Suporta JPG, PNG, WebP</p>
      </div>
    </div>
  );
}
