'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AuthRedirectClient({ to = '/login' }: { to?: string }) {
  const router = useRouter();

  useEffect(() => {
    // push to ensure client-side navigation without throwing server redirect
    router.push(to);
  }, [router, to]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
        <div className="text-sm text-gray-600">
          Redirecionando para login...
        </div>
      </div>
    </div>
  );
}
