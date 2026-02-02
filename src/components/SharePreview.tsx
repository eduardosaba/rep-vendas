import React from 'react';
import { Share2, Globe } from 'lucide-react';

interface SharePreviewProps {
  title: string;
  description: string;
  imageUrl: string;
  domain: string;
  href?: string;
  message?: string | null;
}

const SharePreview: React.FC<SharePreviewProps> = ({
  title,
  description,
  imageUrl,
  domain,
  href,
  message,
}) => {
  return (
    <div className="mt-8 space-y-4">
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
        <Share2 size={16} /> Preview de Compartilhamento (WhatsApp)
      </h4>

      <div className="max-w-sm bg-[#e7f3ef] dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="aspect-[1.91/1] w-full bg-white relative overflow-hidden border-b border-slate-200 dark:border-slate-700">
          {href ? (
            // eslint-disable-next-line @next/next/no-html-link-for-pages
            <a href={href} target="_blank" rel="noopener noreferrer">
              <img
                src={imageUrl || '/link.webp'}
                alt="Link Preview"
                className="w-full h-full object-cover"
              />
            </a>
          ) : (
            <img
              src={imageUrl || '/link.webp'}
              alt="Link Preview"
              className="w-full h-full object-cover"
            />
          )}
        </div>

        <div className="p-3 space-y-1">
          <p className="text-[11px] text-slate-500 uppercase font-medium flex items-center gap-1">
            <Globe size={10} /> {domain}
          </p>
          <h5 className="text-sm font-bold text-slate-900 dark:text-white truncate">
            {title || 'Catálogo Digital'}
          </h5>
          {message ? (
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {message}
            </p>
          ) : (
            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {description ||
                'Confira nossas coleções exclusivas e faça seu pedido diretamente pelo catálogo virtual.'}
            </p>
          )}
        </div>
      </div>

      <p className="text-[10px] text-slate-400 italic">
        * A renderização exata pode variar dependendo da versão do WhatsApp e do
        sistema operacional.
      </p>
    </div>
  );
};

export default SharePreview;
