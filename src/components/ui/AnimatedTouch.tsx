'use client';

import { useState } from 'react';

export default function AnimatedTouch({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: (e?: any) => void;
}) {
  const [clicked, setClicked] = useState(false);

  const handle = (e?: any) => {
    try {
      setClicked(true);
      onClick?.(e);
    } finally {
      window.setTimeout(() => setClicked(false), 260);
    }
  };

  const rippleStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: 'var(--primary)',
    transform: clicked
      ? 'translate(-50%, -50%) scale(3)'
      : 'translate(-50%, -50%) scale(0)',
    opacity: clicked ? 0 : 0.16,
    transition: 'transform 260ms ease-out, opacity 260ms ease-out',
    pointerEvents: 'none',
  };

  return (
    <span
      onClick={handle}
      className="relative inline-flex items-center justify-center"
    >
      <span
        className={`transform transition-transform duration-150 inline-flex items-center justify-center`}
        style={{
          transform: clicked ? 'scale(1.12)' : 'scale(1)',
        }}
      >
        {children}
      </span>
      <span aria-hidden style={rippleStyle} />
    </span>
  );
}
