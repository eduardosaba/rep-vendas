'use client';

import { useState, useEffect } from 'react';
import { Plus, Save, Loader2, Trash2, Package, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getPlans, upsertPlan, deletePlan } from './actions';

interface Plan {
  id?: string; // Opcional pois ao criar novo ainda não tem ID
  name: string;
  price: number;
  max_products: number;
  active: boolean;
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    const res = await getPlans();
    if (res.success && res.data) {
      setPlans(res.data);
    } else {
      toast.error(res.error || 'Erro ao carregar planos');
    }
    setLoading(false);
  };

  const handleUpdate = async (plan: Plan) => {
    if (!plan.id) return; // Segurança
    setSavingId(plan.id);
    
    const res = await upsertPlan(plan);
    
    if (res.success) {
      toast.success('Plano salvo com sucesso!');
      // Atualiza a lista local com os dados retornados do banco (garante sincronia)
      setPlans(prev => prev.map(p => p.id === plan.id ? res.data : p));
    } else {
      toast.error('Erro ao salvar: ' + res.error);
    }
    setSavingId(null);
  };

  const handleCreate = async () => {
    const tempId = 'temp-' + Date.now(); // ID temporário para UI
    setSavingId(tempId);
    
    // Criação imediata no banco com dados padrão
    const newPlanData = {
      name: 'Novo Plano',
      price: 0,
      max_products: 100,
      active: true,
    };

    const res = await upsertPlan(newPlanData);

    if (res.success) {
      toast.success('Plano criado!');
      setPlans(prev => [res.data, ...prev]);
    } else {
      toast.error('Erro ao criar: ' + res.error);
    }
    setSavingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ATENÇÃO: Excluir um plano pode afetar usuários que já o possuem. Deseja continuar?')) return;

    const res = await deletePlan(id);
    if (res.success) {
      toast.success('Plano excluído');
      setPlans(prev => prev.filter(p => p.id !== id));
    } else {
      toast.error('Erro ao excluir: ' + res.error);
    }
  };

  // Helper para atualizar estado local (Edição "Live" estilo Excel)
  const updateLocalState = (index: number, field: keyof Plan, value: any) => {
    const newPlans = [...plans];
    newPlans[index] = { ...newPlans[index], [field]: value };
    setPlans(newPlans);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="text-indigo-600" /> Planos & Limites
          </h1>
          <p className="text-gray-500 mt-1">
            Configure os níveis de assinatura, preços e limites de recursos.
          </p>
        </div>
        <button
          onClick={handleCreate}
          disabled={!!savingId}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-sm shadow-indigo-200"
        >
          {savingId && savingId.startsWith('temp') ? <Loader2 className="animate-spin" size={18}/> : <Plus size={18} />}
          Novo Plano
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full flex flex-col items-center justify-center p-20 text-gray-400">
            <Loader2 className="animate-spin mb-2 text-indigo-600" size={32} />
            <p>Carregando planos...</p>
          </div>
        ) : plans.length === 0 ? (
           <div className="col-span-full text-center p-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
             <p className="text-gray-500">Nenhum plano cadastrado.</p>
           </div>
        ) : (
          plans.map((plan, index) => (
            <div
              key={plan.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 flex flex-col gap-4 overflow-hidden group
                ${plan.active ? 'border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md' : 'border-gray-100 dark:border-slate-900 opacity-75 grayscale-[0.5]'}
              `}
            >
              {/* Header do Card */}
              <div className="p-6 pb-0 flex justify-between items-start gap-2">
                <input
                  value={plan.name}
                  onChange={(e) => updateLocalState(index, 'name', e.target.value)}
                  placeholder="Nome do Plano"
                  className="text-xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-transparent focus:border-indigo-500 outline-none w-full placeholder:text-gray-300 transition-colors"
                />
                <button
                  onClick={() => plan.id && handleDelete(plan.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors p-1"
                  title="Excluir Plano"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {/* Preço */}
              <div className="px-6 flex items-baseline gap-1">
                <span className="text-gray-400 text-sm font-medium">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={plan.price}
                  onChange={(e) => updateLocalState(index, 'price', parseFloat(e.target.value))}
                  className="text-3xl font-bold text-gray-900 dark:text-white bg-transparent outline-none w-32 focus:text-indigo-600 transition-colors"
                />
                <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">/mês</span>
              </div>

              {/* Configurações */}
              <div className="px-6 py-4 bg-gray-50/50 dark:bg-slate-800/50 space-y-4 flex-1">
                {/* Max Produtos */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                    Limite de Produtos
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={plan.max_products}
                      onChange={(e) => updateLocalState(index, 'max_products', parseInt(e.target.value))}
                      className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-gray-400 pointer-events-none">
                      SKUs
                    </span>
                  </div>
                </div>

                {/* Status Ativo/Inativo */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-700">
                  <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                    Status do Plano
                  </span>
                  <button
                    onClick={() => updateLocalState(index, 'active', !plan.active)}
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                      ${plan.active ? 'bg-green-500' : 'bg-gray-200 dark:bg-slate-700'}
                    `}
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        ${plan.active ? 'translate-x-6' : 'translate-x-1'}
                      `}
                    />
                  </button>
                </div>
              </div>

              {/* Botão Salvar */}
              <div className="p-4 pt-0">
                <button
                  onClick={() => handleUpdate(plan)}
                  disabled={savingId === plan.id}
                  className="w-full py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/30 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-70"
                >
                  {savingId === plan.id ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  {savingId === plan.id ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}