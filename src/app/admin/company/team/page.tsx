'use client';
import React, { useEffect, useState } from 'react';
import { UserPlus, Mail, Shield, Trash2, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getTeamMembers, addTeamMember } from './actions';

interface Member {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  status?: string;
}

export default function CompanyTeamPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await getTeamMembers();
      if (res.success) setMembers(res.data || []);
      else throw new Error(res.error || 'Erro');
    } catch (err: any) {
      toast.error('Falha ao carregar equipe', { description: err?.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.name) {
      return toast.error('Preencha todos os campos');
    }
    setIsCreating(true);
    try {
      const res = await addTeamMember(form);
      if (res.success) {
        toast.success('Vendedor adicionado!');
        setForm({ email: '', password: '', name: '' });
        setIsModalOpen(false);
        fetchMembers();
      } else {
        throw new Error(res.error || 'Erro ao adicionar');
      }
    } catch (err: any) {
      toast.error('Falha ao adicionar vendedor', { description: err?.message });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Minha Equipe</h1>
          <p className="text-slate-500 font-medium">Gerencie o acesso dos seus representantes</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="h-12 rounded-2xl gap-2">
          <UserPlus size={20} /> Adicionar Vendedor
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div>Carregando...</div>
        ) : members.length === 0 ? (
          <div className="p-6 bg-white rounded-xl border">Nenhum representante cadastrado.</div>
        ) : (
          members.map((m) => (
            <div key={m.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group hover:border-primary/50 transition-all">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-xl font-black text-slate-400">{m.full_name?.slice(0,2).toUpperCase() || m.email?.slice(0,2).toUpperCase()}</div>
                <div>
                  <h3 className="font-bold text-slate-800">{m.full_name || m.email}</h3>
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase">Representante</span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-xs text-slate-500"><Mail size={14} className="text-slate-300" /> {m.email}</div>
                <div className="flex items-center gap-2 text-xs text-slate-500"><Shield size={14} className="text-slate-300" /> {m.status === 'blocked' ? 'Acesso Bloqueado' : 'Acesso Ativo'}</div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-50">
                <Button variant="ghost" size="sm" className="flex-1 text-slate-400 hover:text-primary gap-1"><Key size={14} /> Resetar Senha</Button>
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal simples */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsModalOpen(false)} />
          <form onSubmit={handleAdd} className="relative z-50 bg-white p-6 rounded-xl w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Adicionar Vendedor</h3>
            <div className="space-y-3">
              <input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full p-3 rounded-lg border" />
              <input placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full p-3 rounded-lg border" />
              <input placeholder="Senha" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full p-3 rounded-lg border" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" isLoading={isCreating}>Adicionar</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

