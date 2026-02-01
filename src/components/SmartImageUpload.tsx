import React, { useState } from 'react';

interface SmartUploadProps {
  onUploadReady: (file: File | Blob) => void;
  maxDimension?: number;
  quality?: number; // 0..1
  accept?: string;
  className?: string;
  multiple?: boolean;
  initialPreview?: string | null;
}

export const SmartImageUpload: React.FC<SmartUploadProps> = ({
  onUploadReady,
  maxDimension = 800,
  quality = 0.8,
  accept = 'image/*',
  className = '',
  multiple = false,
  initialPreview = null,
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const prevPreviewRef = React.useRef<string | null>(null);

  // Sync external initial preview (e.g., when editing an item)
  React.useEffect(() => {
    try {
      const prev = prevPreviewRef.current;
      if (prev && prev.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(prev);
        } catch (e) {}
      }
    } catch {}
    prevPreviewRef.current = initialPreview ?? null;
    setPreview(initialPreview ?? null);
  }, [initialPreview]);

  const handleFile = async (file: File) => {
    try {
      // Prefer createImageBitmap + OffscreenCanvas when available for large images
      const bitmap = await createImageBitmap(file as Blob).catch(() => null);
      const useOffscreen = typeof OffscreenCanvas !== 'undefined';
      if (bitmap) {
        let width = bitmap.width;
        let height = bitmap.height;
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        try {
          const canvas: HTMLCanvasElement | OffscreenCanvas = useOffscreen
            ? new OffscreenCanvas(width, height)
            : (document.createElement('canvas') as HTMLCanvasElement);
          canvas.width = width;
          canvas.height = height;

          const ctx = (canvas as any).getContext('2d');
          if (!ctx) throw new Error('Canvas context unavailable');
          ctx.drawImage(bitmap, 0, 0, width, height);

          const blob: Blob | null = useOffscreen
            ? await (canvas as OffscreenCanvas).convertToBlob({
                type: 'image/webp',
                quality,
              })
            : await new Promise<Blob | null>((resolve) =>
                (canvas as HTMLCanvasElement).toBlob(
                  (b) => resolve(b),
                  'image/webp',
                  quality
                )
              );

          if (blob) {
            try {
              const url = URL.createObjectURL(blob);
              setPreview(url);
              prevPreviewRef.current = url;
            } catch (err) {}
            const outFile = new File([blob], `${Date.now()}.webp`, {
              type: blob.type,
            });
            onUploadReady(outFile);
            return;
          }
        } catch (err) {
          // fallback to reader approach below
          console.warn('SmartImageUpload: bitmap/canvas fallback', err);
        }
      }

      // Fallback: use FileReader + Image element
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
      });

      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve();

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                try {
                  const url = URL.createObjectURL(blob);
                  setPreview(url);
                  prevPreviewRef.current = url;
                } catch (err) {}
                const outFile = new File([blob], `${Date.now()}.webp`, {
                  type: blob.type,
                });
                onUploadReady(outFile);
              } else {
                onUploadReady(file);
              }
              resolve();
            },
            'image/webp',
            quality
          );
        };
        img.onerror = () => {
          onUploadReady(file);
          resolve();
        };
        img.src = dataUrl as string;
      });
    } catch (err) {
      onUploadReady(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    if (multiple) {
      files.forEach((f) => void handleFile(f));
    } else {
      void handleFile(files[0]);
    }
  };

  return (
    <div
      className={`flex flex-col items-center gap-4 p-6 border-2 border-dashed rounded-2xl border-gray-200 dark:border-slate-700 ${className}`}
    >
      {preview ? (
        <div className="relative w-40 h-40">
          <img
            src={preview}
            className="w-full h-full object-contain rounded-lg shadow-md"
            alt="preview"
          />
          <button
            onClick={() => {
              try {
                if (preview && preview.startsWith('blob:'))
                  URL.revokeObjectURL(preview);
              } catch {}
              prevPreviewRef.current = null;
              setPreview(null);
            }}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs"
            type="button"
          >
            ✕
          </button>
        </div>
      ) : (
        <label className="cursor-pointer flex flex-col items-center">
          <span className="text-blue-500 font-bold text-sm">
            Clique para subir a foto
          </span>
          <span className="text-gray-400 text-xs text-center mt-1">
            Nós otimizamos automaticamente para você.
          </span>
          <input
            type="file"
            className="hidden"
            accept={accept}
            onChange={handleFileChange}
            multiple={multiple}
          />
        </label>
      )}
    </div>
  );
};

export default SmartImageUpload;
