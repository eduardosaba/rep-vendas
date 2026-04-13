"use client";

import React from 'react';
import { createClient } from '@/lib/supabase/client';

export default function DevForceLogout() {
  const handleForceLogout = async () => {
    try {
      const supabase = createClient();
      // Try supabase signOut but do not block on errors
      try {
        await supabase.auth.signOut();
      } catch (e) {
        // ignore
      }

      // Clear storages
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {}

      // Remove cookies that commonly store auth/session info
      try {
        document.cookie.split(';').forEach((c) => {
          const name = c.split('=')[0].trim();
          if (!name) return;
          // remove all cookies for site to ensure clean state
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        });
      } catch (e) {}

      // Unregister service workers (if any)
      try {
        if (navigator?.serviceWorker?.getRegistrations) {
          const regs = await navigator.serviceWorker.getRegistrations();
          regs.forEach((r) => r.unregister());
        }
      } catch (e) {}

      // Reload to login
      window.location.href = '/login';
    } catch (err) {
      // fallback
      window.location.href = '/login';
    }
  };

  return (
    <button
      onClick={handleForceLogout}
      title="Limpar sessão (apenas dev)"
      className="hidden md:inline-flex items-center px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 dark:bg-transparent dark:text-red-400"
    >
      Limpar Sessão
    </button>
  );
}
