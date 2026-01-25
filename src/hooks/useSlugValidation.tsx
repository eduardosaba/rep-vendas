'use client';

import { useEffect, useState } from 'react';

export function useSlugValidation(slug: string) {
  const [status, setStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken'
  >('idle');

  useEffect(() => {
    if (!slug || slug.trim().length < 2) {
      setStatus('idle');
      return;
    }

    let mounted = true;
    const timer = setTimeout(async () => {
      if (!mounted) return;
      setStatus('checking');
      try {
        const res = await fetch(
          `/api/short-links?code=${encodeURIComponent(slug)}`
        );
        const json = await res.json();
        if (!mounted) return;
        if (json?.exists) setStatus('taken');
        else setStatus('available');
      } catch (e) {
        if (mounted) setStatus('idle');
      }
    }, 450);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [slug]);

  return status;
}

export default useSlugValidation;
