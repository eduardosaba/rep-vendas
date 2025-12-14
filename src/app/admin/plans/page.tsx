'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Check, Save, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Plan {
  id: string;
  name: string;
  price: number;
  max_products: number;
  active: boolean;
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('price');
    if (error) toast.error('Erro ao buscar planos');
    else setPlans(data || []);
    setLoading(false);
  };

  const handleUpdate = async (plan: Plan) => {
    setSavingId(plan.id);
    try {
      const { error } = await supabase
        .from('plans')
        .update({
          name: plan.name,
          price: plan.price,
          max_products: plan.max_products,
          active: plan.active,
        })
        .eq('id', plan.id);

      if (error) throw error;
      toast.success('Plano atualizado com sucesso!');
    } catch (e) {
      toast.error('Erro ao salvar');
    } finally {
      setSavingId(null);
    }
  };

  const handleCreate = async () => {
    const { error } = await supabase.from('plans').insert({
      name: 'Novo Plano',
      price: 0,
      max_products: 500,
      active: true,
    });
    if (error) toast.error('Erro ao criar');
    else {
      toast.success('Plano criado');
      fetchPlans();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza? Usuários neste plano podem ficar sem acesso.'))
      return;
    const { error } = await supabase.from('plans').delete().eq('id', id);
    if (error) toast.error('Erro ao excluir');
    else {
      toast.success('Plano excluído');
      setPlans((prev) => prev.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Planos & Limites
          </h1>
          <p className="text-gray-500">
            Defina os limites de cada nível de assinatura.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors"
        >
          <Plus size={18} /> Novo Plano
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 text-center p-12">
            <Loader2 className="animate-spin mx-auto text-indigo-600" />
          </div>
        ) : (
          plans.map((plan, index) => (
            <div
              key={plan.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm p-6 relative flex flex-col gap-4"
            >
              {/* Header do Card */}
              <div className="flex justify-between items-start">
                <input
                  value={plan.name}
                  onChange={(e) => {
                    const newPlans = [...plans];
                    newPlans[index].name = e.target.value;
                    setPlans(newPlans);
                  }}
                  className="text-xl font-bold text-gray-900 dark:text-white bg-transparent border-b border-transparent focus:border-indigo-500 outline-none w-full"
                />
                <button
                  onClick={() => handleDelete(plan.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {/* Preço */}
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">R$</span>
                <input
                  type="number"
                  value={plan.price}
                  onChange={(e) => {
                    const newPlans = [...plans];
                    newPlans[index].price = parseFloat(e.target.value);
                    setPlans(newPlans);
                  }}
                  className="text-3xl font-bold text-gray-900 dark:text-white bg-transparent border-b border-transparent focus:border-indigo-500 outline-none w-24"
                />
                <span className="text-gray-500 text-sm">/mês</span>
              </div>

              {/* Configurações (Onde você define o limite) */}
              <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    Limite de Produtos
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      value={plan.max_products}
                      onChange={(e) => {
                        const newPlans = [...plans];
                        newPlans[index].max_products = parseInt(e.target.value);
                        setPlans(newPlans);
                      }}
                      className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 dark:bg-slate-800 text-sm font-mono"
                    />
                    <span className="text-xs text-gray-500">itens</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Plano Ativo?
                  </span>
                  <input
                    type="checkbox"
                    checked={plan.active}
                    onChange={(e) => {
                      const newPlans = [...plans];
                      newPlans[index].active = e.target.checked;
                      setPlans(newPlans);
                    }}
                    className="w-5 h-5 text-indigo-600 rounded"
                  />
                </div>
              </div>

              {/* Botão Salvar */}
              <button
                onClick={() => handleUpdate(plan)}
                disabled={savingId === plan.id}
                className="mt-auto w-full py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
              >
                {savingId === plan.id ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}
                Salvar Alterações
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
