import React from 'react';

type Props = {
  product: any;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLImageElement>;
};

export default function ProductImage({
  product,
  alt,
  className,
  style,
  onClick,
}: Props) {
  // Prioridade desejada: 1) image_path (interno no Storage)
  //                      2) external_image_url (URL externa vinda da importação)
  //                      3) placeholder padrão
  const internalPath =
    (product as any).image_path || (product as any).image_path_public || null;
  const external = (product as any).external_image_url || null;

  const src = internalPath
    ? `${(process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')}/storage/v1/object/public/products/${internalPath}`
    : external
      ? external
      : '/placeholder.png';

  return (
    // Usamos <img> simples com fallback onError para trocar para placeholder
    // Isso é suficiente para a maioria dos catálogos; troque por <Image> do Next se desejar otimizações.
    <img
      src={src}
      alt={alt || product?.name || 'Produto'}
      className={className || 'w-full h-auto object-cover'}
      style={style}
      onClick={onClick}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src = '/placeholder.png';
      }}
    />
  );
}
