import React from 'react';
import { SmartImage } from './SmartImage';

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
  return (
    <div
      className={`relative bg-white ${className || 'w-full h-auto'}`}
      style={style}
      onClick={onClick}
    >
      <SmartImage
        product={product}
        className="w-full h-full"
        imgClassName={className || 'object-contain'}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );
}
