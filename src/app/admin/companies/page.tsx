'use client';

import { useState, useEffect, useTransition } from 'react';
import { Plus, Building2, Globe, ShieldCheck, Loader2 } from 'lucide-react';
import { getCompanies, createCompanyWithAdmin } from './actions';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type NewCompanyForm = {
  companyName: string;
  slug: string;
  cnpj: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
};

const initialForm: NewCompanyForm = {
  companyName: '',
  slug: '',
  cnpj: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
};

function slugify(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

export default function CompaniesAdminPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [slugTouched, setSlugTouched] = useState(false);
  const [newCompany, setNewCompany] = useState<NewCompanyForm>(initialForm);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    const res = await getCompanies();
    if (res.success && res.data) setCompanies(res.data as any[]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createCompanyWithAdmin(newCompany);
      if (res.success) {
        toast.success('Distribuidora e administrador criados com sucesso!');
        setIsModalOpen(false);
        setNewCompany(initialForm);
        setSlugTouched(false);
        fetchCompanies();
      } else {
        toast.error(res.error || 'Erro ao criar distribuidora');
      }
    });
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Distribuidoras</h1>
          <p className="text-slate-500">Gerencie os clientes corporativos B2B</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus size={20} /> Nova Distribuidora
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {companies.map((company) => (
          <div key={company.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-primary/10 p-3 rounded-2xl text-primary">
                <Building2 size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">{company.name}</h3>
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-bold uppercase text-slate-500">
                  {company.slug}
                </span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Globe size={14} /> repvendas.com.br/catalogo/{company.slug}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck size={14} /> CNPJ: {company.cnpj || 'Não informado'}
              </div>
            </div>

            <Button variant="outline" className="w-full text-xs">Ver Representantes</Button>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-200 p-6">
            <h3 className="text-lg font-bold mb-4">Nova Distribuidora</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label>
                <input
                  value={newCompany.companyName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setNewCompany((prev) => ({
                      ...prev,
                      companyName: name,
                      slug: slugTouched ? prev.slug : slugify(name),
                    }));
                  }}
                  className="w-full p-2.5 rounded-lg border"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Slug</label>
                <input
                  value={newCompany.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setNewCompany({ ...newCompany, slug: e.target.value });
                  }}
                  onBlur={(e) => {
                    const normalized = slugify(e.target.value);
                    setNewCompany((prev) => ({ ...prev, slug: normalized }));
                  }}
                  className="w-full p-2.5 rounded-lg border"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CNPJ</label>
                <input
                  value={newCompany.cnpj}
                  onChange={(e) => setNewCompany({ ...newCompany, cnpj: e.target.value })}
                  className="w-full p-2.5 rounded-lg border"
                />
              </div>

              <div className="pt-2 border-t border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Administrador da Distribuidora</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Admin</label>
                    <input
                      value={newCompany.adminName}
                      onChange={(e) => setNewCompany({ ...newCompany, adminName: e.target.value })}
                      className="w-full p-2.5 rounded-lg border"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail do Admin</label>
                    <input
                      type="email"
                      value={newCompany.adminEmail}
                      onChange={(e) => setNewCompany({ ...newCompany, adminEmail: e.target.value })}
                      className="w-full p-2.5 rounded-lg border"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha Provisória</label>
                    <input
                      type="password"
                      minLength={8}
                      value={newCompany.adminPassword}
                      onChange={(e) => setNewCompany({ ...newCompany, adminPassword: e.target.value })}
                      className="w-full p-2.5 rounded-lg border"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSlugTouched(false);
                  }}
                  type="button"
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" /> Criando...
                    </span>
                  ) : (
                    'Criar'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
