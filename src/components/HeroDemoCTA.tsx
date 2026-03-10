import React from 'react';
import Link from 'next/link';

export default function HeroDemoCTA({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  const isInternal = href && href.startsWith('/');
  if (isInternal) {
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }
  return (
    <a href={href} className={className} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}
