import React, { useState } from 'react';
import Image from 'next/image';

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

  const src = error
    ? '/placeholder-no-image.svg'
    : internalPath
      ? `${(process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')}/storage/v1/object/public/product-images/${internalPath}`
      : external
        ? external
        : '/placeholder-no-image.svg';

  // Detect object-fit preference from className (object-contain/object-cover)
  const prefersContain = className?.includes('object-contain');

  return (
    <div
      className={`relative ${className || 'w-full h-auto'}`}
      style={style}
      onClick={onClick}
    >
      <Image
        src={src}
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
    </div>
  );
}
