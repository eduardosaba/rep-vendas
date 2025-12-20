'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface FeatureFlag {
  id: string;
  key: string;
  description: string;
  is_enabled: boolean;
}

export default function FeaturesPage() {
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    const { data } = await supabase
      .from('feature_flags')
      .select('*')
      .order('key');
    setFeatures(data || []);
    setLoading(false);
  };

  const handleToggle = async (id: string, currentValue: boolean) => {
    setToggling(id);
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ is_enabled: !currentValue })
        .eq('id', id);

      if (error) throw error;

      setFeatures((prev) =>
        prev.map((f) => (f.id === id ? { ...f, is_enabled: !currentValue } : f))
      );
      toast.success(currentValue ? 'Feature desativada' : 'Feature ativada');
    } catch {
      toast.error('Erro ao atualizar');
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Controle de Funcionalidades
        </h1>
        <p className="text-gray-500">
          Ative ou desative recursos globais do sistema (Kill Switches).
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="animate-spin" />
          </div>
        ) : features.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Nenhuma flag configurada no banco.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {features.map((feature) => (
              <div
                key={feature.id}
                className="p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white font-mono text-lg">
                    {feature.key}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {feature.description}
                  </p>
                </div>

                <button
                  onClick={() => handleToggle(feature.id, feature.is_enabled)}
                  disabled={toggling === feature.id}
                  className={`
                    relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2
                    ${feature.is_enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-700'}
                    ${toggling === feature.id ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <span
                    className={`
                      ${feature.is_enabled ? 'translate-x-7' : 'translate-x-1'}
                      inline-block h-6 w-6 transform rounded-full bg-white transition-transform
                    `}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900 p-4 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
        <strong>Atenção:</strong> As alterações aqui impactam todos os usuários
        imediatamente. Use com cautela.
      </div>
    </div>
  );
}
