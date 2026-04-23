'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ShieldCheck, Loader2, Globe, Building2, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { notifySuccess, notifyError } from '@/lib/notify';

const ALL_TABS = [
  { id: 'geral', label: 'Geral' },
  { id: 'appearance', label: 'Aparência' },
  { id: 'display', label: 'Exibição' },
  { id: 'institucional', label: 'Institucional' },
  { id: 'pages', label: 'Páginas' },
  { id: 'estoque', label: 'Estoque' },
  { id: 'perfil', label: 'Segurança' }
];

const ALL_MENU = [
  'Visão Geral', 'Pedidos', 'Distribuidora', 'Gestão da Distribuidora',
  'Produtos', 'Marketing', 'Ferramentas', 'Clientes', 'Equipe',
  'Comunicados', 'Configurações', 'Ajuda'
];

export default function PermissionsMatrixPage() {
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const supabase = createClient();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchPermissions();
  }, []);

  function dedupeByRoleCompany(list: any[]) {
    const map = new Map<string, any>();
    for (const item of list || []) {
      const key = `${item.role}-${item.company_id ?? 'null'}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, item);
        continue;
      }
      // prefer item with newer updated_at (if available)
      const a = existing?.updated_at ? new Date(existing.updated_at).getTime() : 0;
      const b = item?.updated_at ? new Date(item.updated_at).getTime() : 0;
      if (b >= a) map.set(key, item);
    }
    return Array.from(map.values());
  }

  async function fetchPermissions() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/permissions');
      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch (err) {
        console.error('Invalid JSON response from /api/admin/permissions', text);
      }

      if (!res.ok) {
        console.error('GET /api/admin/permissions failed', res.status, json || text);
        const msg = json?.error || json?.message || `Erro ${res.status}`;
        await notifyError(`Falha ao carregar matriz: ${msg}`);
        setPermissions([]);
      } else {
        setPermissions(dedupeByRoleCompany(json?.data || []));
      }
    } catch (e) {
      console.error('fetchPermissions error', e);
      notifyError('Erro ao carregar matriz de permissões');
    } finally {
      setLoading(false);
    }
  }

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createRoleName, setCreateRoleName] = useState('');
  const createInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (showCreateModal && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [showCreateModal]);

  async function handleCreateRoleSubmit() {
    const name = String(createRoleName || '').trim();
    if (!name) return await notifyError('Nome do papel é obrigatório');
    const roleName = name.toLowerCase().replace(/\s+/g, '_');
    setCreating(true);
    try {
      const res = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: roleName,
          allowed_tabs: [],
          allowed_sidebar_labels: [],
          can_manage_catalog: false,
        }),
      });

      if (!res.ok) throw new Error();
      setShowCreateModal(false);
      setCreateRoleName('');
      await notifySuccess(`Papel "${roleName}" criado com sucesso!`);
      window.dispatchEvent(new Event('permissions-updated'));
      await fetchPermissions();
    } catch (err) {
      await notifyError('Erro ao criar novo papel ou papel já existe');
    } finally {
      setCreating(false);
    }
  }

  function openCreateRoleModal() {
    setCreateRoleName('');
    setShowCreateModal(true);
  }

  function closeCreateRoleModal() {
    setShowCreateModal(false);
    setCreateRoleName('');
  }

  async function togglePermission(role: string, field: string, value: string) {
    const item = permissions.find(p => p.role === role);
    if (!item) return;

    const currentArray = Array.isArray(item[field]) ? item[field] : [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter((v: string) => v !== value)
      : [...currentArray, value];

    updatePermission(role, { [field]: newArray });
  }

  async function updatePermission(role: string, payload: any) {
    const idStr = role;
    setSaving(idStr);

    try {
      const res = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, ...payload }),
      });

      if (!res.ok) throw new Error();
      // Atualização otimista: atualiza o estado local imediatamente (defensiva)
      upsertLocalPermission(role, payload);
      window.dispatchEvent(new Event('permissions-updated'));
      await notifySuccess(`Atualizado: ${role}`);
    } catch (err) {
      await notifyError('Falha ao salvar alteração');
      // Em caso de erro, recarrega do servidor para garantir consistência
      await fetchPermissions();
    } finally {
      setSaving(null);
    }
  }

  // defensive dedupe when updating optimistically
  function upsertLocalPermission(role: string, payload: any) {
    setPermissions((prev) => {
      const list = [...prev];
      const idx = list.findIndex((p) => p.role === role);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...payload, updated_at: new Date().toISOString() };
      } else {
        list.unshift({ role, ...payload, updated_at: new Date().toISOString() });
      }
      return dedupeByRoleCompany(list);
    });
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!loading && permissions.length === 0) {
    return (
      <div className="p-8">
        <header className="mb-6">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            Matriz de Recursos <ShieldCheck className="text-indigo-600" size={28} />
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Configure o que cada Role pode acessar globalmente ou por Distribuidora.</p>
        </header>

        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 p-6 rounded shadow-sm">
          <h3 className="font-bold">Nenhum registro encontrado</h3>
          <p className="text-sm text-slate-600 mt-2">A matriz de permissões está vazia. Verifique se a migration <strong>SQL/2026-04-23-role_permissions-struct.sql</strong> foi executada e se existem registros em <strong>role_permissions</strong> no seu banco.</p>
          <div className="mt-4 flex gap-2">
            <button onClick={fetchPermissions} className="px-3 py-2 border rounded">Tentar Novamente</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            Matriz de Recursos <ShieldCheck className="text-indigo-600" size={28} />
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Configure o que cada Role pode acessar globalmente ou por Distribuidora.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={openCreateRoleModal} disabled={creating} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-200">
            <Plus size={16} />
            Novo Papel
          </button>
        </div>
      </header>

      <div className="grid gap-8">
        {permissions.map((perm) => (
          <section key={perm.role} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="px-8 py-5 bg-gray-50/50 dark:bg-slate-950/30 border-b flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-indigo-100 text-indigo-600`}>
                  <Globe size={20} />
                </div>
                <div>
                  <h2 className="font-black uppercase tracking-tight text-lg text-slate-800 dark:text-white">
                    {perm.role}
                    <span className="ml-2 text-xs font-medium lowercase text-slate-400">(Definido por Role)</span>
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {saving === perm.role && (
                <span className="flex items-center gap-2 text-xs font-bold text-indigo-600 animate-pulse"><Loader2 size={12} className="animate-spin" /> SALVANDO...</span>
                )}

                <button
                  onClick={async () => {
                    if (!confirm(`Excluir papel "${perm.role}"? Esta ação é irreversível.`)) return;
                    try {
                      setSaving(perm.role);
                      const res = await fetch(`/api/admin/permissions?role=${encodeURIComponent(perm.role)}`, { method: 'DELETE' });
                      if (!res.ok) throw new Error('delete failed');
                      await notifySuccess(`Papel "${perm.role}" removido`);
                      await fetchPermissions();
                    } catch (e) {
                      console.error('delete role error', e);
                      await notifyError('Falha ao excluir papel');
                      await fetchPermissions();
                    } finally {
                      setSaving(null);
                    }
                  }}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-60 flex items-center gap-2"
                >
                  <Trash2 size={14} /> Excluir
                </button>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><CheckCircle2 size={14} /> Abas Permitidas (Settings)</h3>
                <div className="flex flex-wrap gap-2">
                  {ALL_TABS.map(tab => {
                    const isActive = perm.allowed_tabs?.includes(tab.id);
                    return (
                      <button key={tab.id} onClick={() => togglePermission(perm.role, 'allowed_tabs', tab.id)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all border ${isActive ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border-gray-200 text-slate-400 hover:border-indigo-300'}`}>
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><CheckCircle2 size={14} /> Itens do Menu Lateral</h3>
                <div className="flex flex-wrap gap-2">
                  {ALL_MENU.map(label => {
                    const isActive = perm.allowed_sidebar_labels?.includes(label);
                    return (
                      <button key={label} onClick={() => togglePermission(perm.role, 'allowed_sidebar_labels', label)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all border ${isActive ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-white border-gray-200 text-slate-400 hover:border-emerald-300'}`}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-8 py-4 bg-slate-50/30 border-t flex items-center gap-4">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={perm.can_manage_catalog} onChange={(e) => updatePermission(perm.role, { can_manage_catalog: e.target.checked })} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                <span className="ml-3 text-xs font-bold text-slate-600 uppercase">Pode Gerenciar Catálogo Completo</span>
              </label>
              <div className="ml-auto">
                <button disabled={saving === perm.role} onClick={async () => {
                  // Save full permission object explicitly
                  const idStr = perm.role;
                  try {
                    setSaving(idStr);
                    const body = {
                      role: perm.role,
                      allowed_tabs: perm.allowed_tabs ?? [],
                      allowed_sidebar_labels: perm.allowed_sidebar_labels ?? [],
                      can_manage_catalog: Boolean(perm.can_manage_catalog ?? false),
                    };
                    const res = await fetch('/api/admin/permissions', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(body),
                    });
                    if (!res.ok) throw new Error('save failed');
                    upsertLocalPermission(perm.role, body);
                    window.dispatchEvent(new Event('permissions-updated'));
                    await notifySuccess('Permissões salvas');
                  } catch (e) {
                    await notifyError('Falha ao salvar permissões');
                    await fetchPermissions();
                  } finally {
                    setSaving(null);
                  }
                }} className="px-3 py-2 bg-indigo-600 text-white rounded disabled:opacity-60">Salvar</button>
              </div>
            </div>
          </section>
        ))}
      </div>
      {showCreateModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeCreateRoleModal} />
          <div className="relative bg-white dark:bg-slate-900 rounded-lg shadow-lg w-full max-w-md p-6 z-10">
            <h3 className="text-lg font-bold mb-3">Criar Novo Papel</h3>
            <label className="text-xs font-semibold text-slate-600">Nome do Papel</label>
            <input ref={createInputRef} value={createRoleName} onChange={(e) => setCreateRoleName(e.target.value)} placeholder="ex: admin_master ou distribuidora_x" className="mt-2 mb-4 w-full p-2 border rounded bg-slate-50 dark:bg-slate-800" />
            <div className="flex justify-end gap-2">
              <button onClick={closeCreateRoleModal} className="px-3 py-2 rounded border">Cancelar</button>
              <button onClick={async () => { await handleCreateRoleSubmit(); }} disabled={creating} className="px-3 py-2 bg-indigo-600 text-white rounded">{creating ? 'Criando...' : 'Criar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
