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
    ? '/placeholder.png'
    : internalPath
      ? `${(process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')}/storage/v1/object/public/products/${internalPath}`
      : external
        ? external
        : '/placeholder.png';

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
        className="object-cover"
        onError={() => setError(true)}
      />
    </div>
  );
}
