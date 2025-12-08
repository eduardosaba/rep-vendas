'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Image as ImageIcon } from 'lucide-react';

interface ImageDropzoneProps {
  onDrop: (files: File[]) => void;
}

export function ImageDropzone({ onDrop }: ImageDropzoneProps) {
  const onDropCallback = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles?.length > 0) {
        onDrop(acceptedFiles);
      }
    },
    [onDrop]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropCallback,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        relative border-2 border-dashed rounded-xl p-12 transition-all cursor-pointer text-center
        ${
          isDragActive
            ? 'border-indigo-500 bg-indigo-50 scale-[1.01]'
            : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50 bg-white'
        }
      `}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center justify-center gap-4">
        <div
          className={`
          p-4 rounded-full 
          ${isDragActive ? 'bg-indigo-100 rv-text-primary' : 'bg-gray-100 text-gray-500'}
        `}
        >
          <UploadCloud size={32} />
        </div>

        <div className="space-y-1">
          <p className="text-lg font-medium text-gray-700">
            {isDragActive
              ? 'Solte as fotos aqui'
              : 'Arraste fotos ou clique aqui'}
          </p>
          <p className="text-sm text-gray-500">Suporta JPG, PNG e WebP</p>
        </div>
      </div>
    </div>
  );
}
