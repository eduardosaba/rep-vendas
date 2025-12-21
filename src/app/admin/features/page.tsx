'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Loader2, 
  ToggleLeft, 
  ToggleRight, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  Code2, 
  X 
} from 'lucide-react';
import { 
  getFeatureFlags, 
  toggleFeatureFlag, 
  createFeatureFlag, 
  deleteFeatureFlag 
} from './actions';

interface FeatureFlag {
  id: string;
  key: string;
  description: string;
  is_enabled: boolean;
}

export default function FeaturesPage() {
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Estado do Modal de Criação
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFeature, setNewFeature] = useState({ key: '', description: '' });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    setLoading(true);
    const res = await getFeatureFlags();
    if (res.success && res.data) {
      setFeatures(res.data);
    } else {
      toast.error('Erro ao carregar flags');
    }
    setLoading(false);
  };

  const handleToggle = async (id: string, currentValue: boolean) => {
    setProcessingId(id);
    // Otimistic Update (Atualiza visualmente antes do servidor)
    setFeatures(prev => prev.map(f => f.id === id ? { ...f, is_enabled: !currentValue } : f));

    const res = await toggleFeatureFlag(id, !currentValue);
    
    if (res.success) {
      toast.success(currentValue ? 'Feature desativada' : 'Feature ativada');
    } else {
      // Reverte se der erro
      setFeatures(prev => prev.map(f => f.id === id ? { ...f, is_enabled: currentValue } : f));
      toast.error('Erro ao atualizar: ' + res.error);
    }
    setProcessingId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    const res = await createFeatureFlag(newFeature);
    
    if (res.success) {
      toast.success('Feature flag criada!');
      setFeatures(prev => [...prev, res.data]);
      setIsCreateOpen(false);
      setNewFeature({ key: '', description: '' });
    } else {
      toast.error(res.error);
    }
    setIsCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza? Se o código estiver usando essa flag, ele pode quebrar.')) return;
    
    setProcessingId(id);
    const res = await deleteFeatureFlag(id);
    
    if (res.success) {
      toast.success('Feature excluída');
      setFeatures(prev => prev.filter(f => f.id !== id));
    } else {
      toast.error(res.error);
    }
    setProcessingId(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ToggleRight className="text-indigo-600" /> Controle de Funcionalidades
          </h1>
          <p className="text-gray-500 mt-1">
            Gerencie "Kill Switches" e liberação gradual de recursos.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-sm"
        >
          <Plus size={18} /> Nova Feature
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
          </div>
        ) : features.length === 0 ? (
          <div className="p-16 text-center text-gray-500 flex flex-col items-center">
            <Code2 size={48} className="text-gray-300 mb-4" />
            <p>Nenhuma flag configurada.</p>
            <p className="text-sm">Crie a primeira para começar a controlar o sistema.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {features.map((feature) => (
              <div
                key={feature.id}
                className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded border border-gray-200 dark:border-slate-700">
                      {feature.key}
                    </span>
                    {feature.is_enabled && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Ativa
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    {feature.description}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {/* Botão Toggle */}
                  <button
                    onClick={() => handleToggle(feature.id, feature.is_enabled)}
                    disabled={processingId === feature.id}
                    className={`
                      relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                      ${feature.is_enabled ? 'bg-green-500' : 'bg-gray-200 dark:bg-slate-700'}
                      ${processingId === feature.id ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <span
                      className={`
                        ${feature.is_enabled ? 'translate-x-6' : 'translate-x-1'}
                        inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm
                      `}
                    />
                  </button>

                  {/* Botão Excluir */}
                  <button
                    onClick={() => handleDelete(feature.id)}
                    disabled={processingId === feature.id}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Excluir Flag"
                  >
                    {processingId === feature.id ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Warning Footer */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 p-4 rounded-lg flex gap-3 items-start">
        <AlertTriangle className="text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" size={20} />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <strong>Zona de Impacto Global:</strong> Alterar estas flags afeta instantaneamente todos os usuários conectados.
          Certifique-se de que o código da aplicação está preparado para lidar com os dois estados (true/false) desta flag.
        </div>
      </div>

      {/* MODAL DE CRIAÇÃO */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-950">
              <h3 className="font-bold text-gray-900 dark:text-white">Nova Feature Flag</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Chave (Key)
                </label>
                <input
                  value={newFeature.key}
                  onChange={(e) => setNewFeature({...newFeature, key: e.target.value})}
                  placeholder="ex: maintenance_mode"
                  className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Será convertida para snake_case (ex: MINHA_FEATURE -&gt; minha_feature)
                </p>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Descrição
                </label>
                <textarea
                  value={newFeature.description}
                  onChange={(e) => setNewFeature({...newFeature, description: e.target.value})}
                  placeholder="O que esta flag controla?"
                  className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm h-24 resize-none"
                  required
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2"
                >
                  {isCreating ? <Loader2 className="animate-spin" size={16} /> : 'Criar Flag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}