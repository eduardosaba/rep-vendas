import React, { useState } from 'react';

interface SmartUploadProps {
  onUploadReady: (file: File | Blob) => void;
  maxDimension?: number;
  quality?: number; // 0..1
  accept?: string;
  className?: string;
  multiple?: boolean;
  initialPreview?: string | null;
  onMetaChange?: (meta: { mode?: string; focusX?: number; focusY?: number; zoom?: number }) => void;
  initialMeta?: { mode?: string; focusX?: number; focusY?: number; zoom?: number } | null;
}

export const SmartImageUpload: React.FC<SmartUploadProps> = ({
  onUploadReady,
  maxDimension = 800,
  quality = 0.8,
  accept = 'image/*',
  className = '',
  multiple = false,
  initialPreview = null,
  onMetaChange,
  initialMeta = null,
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const prevPreviewRef = React.useRef<string | null>(null);
  const [focusX, setFocusX] = useState<number>(initialMeta?.focusX ?? 50);
  const [focusY, setFocusY] = useState<number>(initialMeta?.focusY ?? 50);
  const [zoom, setZoom] = useState<number>(initialMeta?.zoom ?? 100);
  const [mode, setMode] = useState<string>(initialMeta?.mode ?? 'fill');

  // Sync external initial preview (e.g., when editing an item)
  React.useEffect(() => {
    try {
      const prev = prevPreviewRef.current;
      if (typeof prev === 'string' && prev.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(prev);
        } catch (e) {}
      }
    } catch {}
    prevPreviewRef.current = initialPreview ?? null;
    setPreview(initialPreview ?? null);
    setFocusX(initialMeta?.focusX ?? 50);
    setFocusY(initialMeta?.focusY ?? 50);
    setZoom(initialMeta?.zoom ?? 100);
    setMode(initialMeta?.mode ?? 'fill');
  }, [initialPreview, initialMeta]);

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
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-80 h-40 overflow-hidden rounded-lg shadow-md bg-gray-100">
            <img
              src={preview}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: `${focusX}% ${focusY}%`,
                transform: `scale(${zoom / 100})`,
                transition: 'transform 120ms linear, object-position 120ms linear',
              }}
              alt="preview"
            />
            <button
              onClick={() => {
                try {
                  if (typeof preview === 'string' && preview.startsWith('blob:'))
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

          <div className="w-80">
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const newMeta = { mode: 'crop-desktop', focusX, focusY, zoom: 100 };
                  setMode('crop-desktop');
                  setZoom(100);
                  onMetaChange?.(newMeta);
                }}
                className={`px-2 py-1 text-sm rounded-md border ${mode === 'crop-desktop' ? 'bg-primary text-white' : 'bg-white'}`}
              >
                Cortar Desktop
              </button>

              <button
                type="button"
                onClick={() => {
                  const newMeta = { mode: 'crop-mobile', focusX, focusY, zoom: 100 };
                  setMode('crop-mobile');
                  setZoom(100);
                  onMetaChange?.(newMeta);
                }}
                className={`px-2 py-1 text-sm rounded-md border ${mode === 'crop-mobile' ? 'bg-primary text-white' : 'bg-white'}`}
              >
                Cortar Mobile
              </button>

              <button
                type="button"
                onClick={() => {
                  const newMeta = { mode: 'fit', focusX: 50, focusY: 50, zoom: 100 };
                  setMode('fit');
                  setFocusX(50);
                  setFocusY(50);
                  setZoom(100);
                  onMetaChange?.(newMeta);
                }}
                className={`px-2 py-1 text-sm rounded-md border ${mode === 'fit' ? 'bg-primary text-white' : 'bg-white'}`}
              >
                Ajustar (Contain)
              </button>

              <button
                type="button"
                onClick={() => {
                  const newMeta = { mode: 'fill', focusX: 50, focusY: 50, zoom: 110 };
                  setMode('fill');
                  setFocusX(50);
                  setFocusY(50);
                  setZoom(110);
                  onMetaChange?.(newMeta);
                }}
                className={`px-2 py-1 text-sm rounded-md border ${mode === 'fill' ? 'bg-primary text-white' : 'bg-white'}`}
              >
                Preencher (Cover)
              </button>

              <button
                type="button"
                onClick={() => {
                  const newMeta = { mode: 'stretch', focusX: 50, focusY: 50, zoom: 100 };
                  setMode('stretch');
                  setFocusX(50);
                  setFocusY(50);
                  setZoom(100);
                  onMetaChange?.(newMeta);
                }}
                className={`px-2 py-1 text-sm rounded-md border ${mode === 'stretch' ? 'bg-primary text-white' : 'bg-white'}`}
              >
                Esticar
              </button>
            </div>

            <div className="mt-3 text-xs text-gray-500">Use os modos para gerar crops específicos para cada layout.</div>
          </div>
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
