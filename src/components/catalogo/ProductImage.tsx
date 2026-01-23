import React, { useState } from 'react';
import Image from 'next/image';
import { getProductImage } from '@/lib/utils/image-logic';

type Props = {
  product: any;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
};

export default function ProductImage({
  product,
  alt,
  className,
  style,
  onClick,
}: Props) {
  const [error, setError] = useState(false);

  // Prioridade desejada: 1) image_path (interno no Storage)
  //                      2) external_image_url (URL externa vinda da importação)
  //                      3) placeholder padrão
  const internalPath =
    (product as any).image_path || (product as any).image_path_public || null;
  const external = (product as any).external_image_url || null;
  const placeholder =
    '/api/proxy-image?url=https%3A%2F%2Faawghxjbipcqefmikwby.supabase.co%2Fstorage%2Fv1%2Fobject%2Fpublic%2Fimages%2Fproduct-placeholder.svg&fmt=webp&q=70';

  const resolvedInternalUrl = internalPath
    ? getProductImage(
        `${(process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')}/storage/v1/object/public/product-images/${internalPath}`,
        'medium'
      ) ||
      `${(process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')}/storage/v1/object/public/product-images/${internalPath}`
    : null;

  const src =
    error || (!product.sync_status && !resolvedInternalUrl && !external)
      ? placeholder
      : product.sync_status === 'pending' && external
        ? external
        : resolvedInternalUrl
          ? resolvedInternalUrl
          : external
            ? external
            : placeholder;

  const isExternalSrc = typeof src === 'string' && src.startsWith('http');

  // Detect object-fit preference from className (object-contain/object-cover)
  const prefersContain = className?.includes('object-contain');

  // Diagnostic logs to help local debugging when images fall back to placeholder
  if (process.env.NODE_ENV !== 'production') {
    try {
      // eslint-disable-next-line no-console
      console.debug('[ProductImage] resolved', {
        id: product?.id,
        name: product?.name,
        sync_status: product?.sync_status,
        internalPath,
        resolvedInternalUrl,
        external,
        chosenSrc: src,
        isExternalSrc,
      });
    } catch (e) {}
  }

  return (
    <div
      className={`relative ${className || 'w-full h-auto'}`}
      style={style}
      onClick={onClick}
    >
      {isExternalSrc ? (
        // Use native <img> for external sources to avoid Next.js remote image restrictions
        // and let the browser fetch directly.
        <img
          src={src as string}
          alt={alt || product?.name || 'Produto'}
          className={`absolute inset-0 w-full h-full ${className || (prefersContain ? 'object-contain' : 'object-cover')}`}
          loading="lazy"
          onError={(e) => {
            setError(true);
            (e.currentTarget as HTMLImageElement).src = placeholder;
          }}
        />
      ) : (
        <Image
          src={src as string}
          alt={alt || product?.name || 'Produto'}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className={
            className || (prefersContain ? 'object-contain' : 'object-cover')
          }
          style={{ objectFit: prefersContain ? 'contain' : 'cover' }}
          loading="lazy"
          quality={80}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}
