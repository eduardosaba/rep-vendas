'use client';

import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Type,
  EyeOff,
  RefreshCw,
  Save,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { getPlans, upsertPlan } from '../actions';

export default function PlanFeaturesMatrix() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    const res = await getPlans();
    if (res.success) setPlans(res.data ?? []);
    setLoading(false);
  };

  const toggleFeature = (planId: string, feature: string) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, [feature]: !p[feature] } : p))
    );
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const plan of plans) {
        await upsertPlan(plan);
      }
      toast.success('Todas as permissões foram atualizadas!');
    } catch (e) {
      toast.error('Erro ao salvar algumas alterações.');
    }
    setSaving(false);
  };

  if (loading)
    return (
      <div className="p-20 text-center">
        <Loader2 className="animate-spin mx-auto" />
      </div>
    );

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <ShieldCheck className="text-indigo-600" /> Matriz de Recursos por
            Plano
          </h1>
          <p className="text-slate-500">
            Defina quais funcionalidades cada nível de assinatura pode acessar.
          </p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving}
          className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all"
        >
          {saving ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Save size={18} />
          )}
          Salvar Matriz
        </button>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="p-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest">
                Funcionalidade
              </th>
              {plans.map((plan) => (
                <th
                  key={plan.id}
                  className="p-4 text-center font-black text-slate-900"
                >
                  {plan.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {/* LINHA: FONTES CUSTOMIZADAS */}
            <tr>
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Type size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Escolher Fontes</p>
                    <p className="text-[10px] text-slate-400">
                      Permite alterar a tipografia do catálogo.
                    </p>
                  </div>
                </div>
              </td>
              {plans.map((plan) => (
                <td key={plan.id} className="p-4 text-center">
                  <input
                    type="checkbox"
                    checked={plan.has_custom_fonts}
                    onChange={() => toggleFeature(plan.id, 'has_custom_fonts')}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </td>
              ))}
            </tr>

            {/* LINHA: REMOVER BRANDING */}
            <tr>
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                    <EyeOff size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-sm">
                      Remover Selo "RepVendas"
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Oculta a marca do sistema no rodapé.
                    </p>
                  </div>
                </div>
              </td>
              {plans.map((plan) => (
                <td key={plan.id} className="p-4 text-center">
                  <input
                    type="checkbox"
                    checked={plan.remove_branding}
                    onChange={() => toggleFeature(plan.id, 'remove_branding')}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </td>
              ))}
            </tr>

            {/* LINHA: SINCRONIZAÇÃO EXCEL */}
            <tr>
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                    <RefreshCw size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Sincronizador PROCV</p>
                    <p className="text-[10px] text-slate-400">
                      Importação avançada via planilhas.
                    </p>
                  </div>
                </div>
              </td>
              {plans.map((plan) => (
                <td key={plan.id} className="p-4 text-center">
                  <input
                    type="checkbox"
                    checked={plan.has_excel_sync}
                    onChange={() => toggleFeature(plan.id, 'has_excel_sync')}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
