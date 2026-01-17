'use client';

import React, { useState } from 'react';
import { Loader2, LayoutDashboard } from 'lucide-react';
import { toast } from 'sonner';

export default function OpenDashboardButton({
  isCollapsed,
}: {
  isCollapsed?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handleOpen(e: React.MouseEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // obtain session token
      const supResp = await fetch('/api/auth/session');
      const supJson = await supResp.json().catch(() => ({}));
      const token = supJson?.access_token || null;

      // Call impersonate endpoint with no target to clear impersonation cookie
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          j.error || 'Não foi possível limpar estado de visualização'
        );
      }

      // Open dashboard in new tab
      window.open('/dashboard', '_blank', 'noopener');
    } catch (err: any) {
      console.error('OpenDashboard error', err);
      toast.error(err?.message || 'Erro ao abrir dashboard');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleOpen}
      className={`mt-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5 ${isCollapsed ? 'justify-center' : ''}`}
      title="Abrir Dashboard do Usuário"
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <LayoutDashboard size={18} />
      )}
      {!isCollapsed && <span>Abrir Dashboard</span>}
    </button>
  );
}
