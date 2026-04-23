"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type RoleKey = 'master' | 'template' | 'admin_company' | 'rep' | 'representative';
type PermissionKey =
  | 'can_edit_appearance'
  | 'can_manage_catalog'
  | 'can_edit_stock'
  | 'can_edit_institutional'
  | 'can_edit_pages'
  | 'can_sync_settings';

const DEFAULT: Record<RoleKey, Record<PermissionKey, boolean>> = {
  master: { can_edit_appearance: true, can_manage_catalog: true, can_edit_stock: true, can_edit_institutional: true, can_edit_pages: true, can_sync_settings: true },
  template: { can_edit_appearance: true, can_manage_catalog: true, can_edit_stock: true, can_edit_institutional: true, can_edit_pages: true, can_sync_settings: true },
  admin_company: { can_edit_appearance: true, can_manage_catalog: true, can_edit_stock: true, can_edit_institutional: true, can_edit_pages: true, can_sync_settings: true },
  rep: { can_edit_appearance: true, can_manage_catalog: false, can_edit_stock: false, can_edit_institutional: false, can_edit_pages: false, can_sync_settings: false },
  representative: { can_edit_appearance: false, can_manage_catalog: false, can_edit_stock: false, can_edit_institutional: false, can_edit_pages: false, can_sync_settings: false },
};

export default function RolesControlPage() {
  const [mapping, setMapping] = useState<Record<string, Record<string, boolean>> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/roles');
        const j = await res.json();
        if (!res.ok) {
          toast.error(j?.error || 'Falha ao carregar mapeamento');
          setMapping(DEFAULT as any);
        } else {
          setMapping(j?.data || DEFAULT);
        }
      } catch (e) {
        setMapping(DEFAULT as any);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggle = (role: string, key: string) => {
    setMapping((m) => ({ ...(m || {}), [role]: { ...((m || {})[role] || {}), [key]: !((m || {})[role] || {})[key] } }));
  };

  const save = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: mapping }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'save failed');
      toast.success('Mapa de permissões salvo');
    } catch (e: any) {
      toast.error('Falha ao salvar: ' + (e?.message || String(e)));
    } finally { setLoading(false); }
  };

  if (!mapping) return <div className="p-6">Carregando...</div>;

  return (
    <div className="p-6 max-w-4xl">
      <h2 className="text-2xl font-bold mb-4">Controle de Roles & Permissões</h2>
      <p className="text-sm text-gray-600 mb-4">Edite quais permissões cada role possui. Essas configurações ajudam a manter o comportamento do SettingsPage e da Torre de Controle.</p>

      <div className="overflow-auto bg-white p-4 rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left p-2">Role</th>
              {Object.keys(Object.values(mapping)[0]).map((k) => (
                <th key={k} className="p-2 text-left">{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.keys(mapping).map((role) => (
              <tr key={role} className="border-t">
                <td className="p-2 font-semibold">{role}</td>
                {Object.keys(mapping[role]).map((perm) => (
                  <td key={perm} className="p-2">
                    <label className="inline-flex items-center">
                      <input type="checkbox" checked={!!mapping[role][perm]} onChange={() => toggle(role, perm)} className="mr-2" />
                      <span className="text-xs">{mapping[role][perm] ? 'Sim' : 'Não'}</span>
                    </label>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant="primary" onClick={save} disabled={loading}>{loading ? 'Salvando...' : 'Salvar Mapeamento'}</Button>
        <Button variant="outline" onClick={() => setMapping(DEFAULT as any)}>Restaurar Padrões</Button>
      </div>
    </div>
  );
}
