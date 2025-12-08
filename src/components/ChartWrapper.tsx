'use client';

import React, { useEffect, useRef, useState } from 'react';

type Props = {
  height?: number | string;
  children: React.ReactNode;
  className?: string;
};

export default function ChartWrapper({
  height = 300,
  children,
  className = '',
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    const check = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) setReady(true);
    };

    // Use ResizeObserver when disponível para montar só quando tivermos medidas válidas
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => check());
      try {
        ro.observe(el);
      } catch (e) {
        // ignore
      }
    }

    // Checagem inicial
    check();

    return () => {
      if (ro) ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{ width: '100%', height, minWidth: 0 }}
    >
      {ready ? children : null}
    </div>
  );
}
