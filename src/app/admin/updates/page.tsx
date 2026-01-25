'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Rocket,
  Calendar,
  CheckCircle2,
  Code,
  Loader2,
  Sparkles,
  Zap,
  LayoutDashboard,
  Trash2,
  Plus,
} from 'lucide-react';

// Tipagem correta baseada no Banco de Dados
interface UpdateItem {
  id: number;
  version: string;
  date: string;
  title: string;
  highlights: string[];
  color_from: string;
  color_to: string;
  created_at: string;
}

// TEMPLATES PRÉ-DEFINIDOS PARA AGILIDADE
const PRESET_TEMPLATES = {
  welcome: {
    title: '🚀 Bem-vindo ao RepVendas: Sua Potência de Vendas!',
    highlights: [
      '📦 GESTÃO: Sincronização via Planilha e Otimização de Imagens.',
      '📱 VENDAS: Links curtos personalizados e filtros para WhatsApp.',
      '🛰️ INTELIGÊNCIA: Gráfico de cliques e ranking de produtos mais vistos.',
      '🔔 ALERTAS: Notificações em tempo real de abertura de catálogo.',
    ],
    colorFrom: '#0f172a',
    colorTo: '#334155',
  },
  new_version: {
    title: '✨ Novidades da Versão 1.1',
    highlights: [
      '📊 Novo Dashboard de Analytics integrado.',
      '📄 Geração de Relatórios de Performance em PDF.',
      '🔗 Encurtador de links com nomes personalizados.',
      '⚡ Melhoria de 40% na velocidade de carregamento.',
    ],
    colorFrom: '#2563eb',
    colorTo: '#0891b2',
  },
  tips: {
    title: '💡 Dicas de Mestre: Potencialize suas Vendas!',
    highlights: [
      '🎯 USE FILTROS: Crie links temáticos (ex: só Solares) para abordagens mais assertivas.',
      '🔗 LINKS CURTOS: Use nomes fáceis como /v/PROMO para ditar por áudio ou telefone.',
      '📊 ANTECIPE DESEJOS: Olhe o ranking "Top Choice" antes de visitar o lojista.',
      '📄 PROVA DE VALOR: Gere o relatório em PDF para mostrar o engajamento às marcas.',
    ],
    colorFrom: '#f59e0b',
    colorTo: '#d97706',
  },
};

export default function AdminUpdatesPage() {
  const currentVersion = process.env.NEXT_PUBLIC_APP_VERSION || '1.1.0';
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [historyUpdates, setHistoryUpdates] = useState<UpdateItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Estados do editor
  const [editorTitle, setEditorTitle] = useState(
    PRESET_TEMPLATES.welcome.title
  );
  const [editorVersion, setEditorVersion] = useState(currentVersion);
  const [editorDate, setEditorDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [editorHighlights, setEditorHighlights] = useState(
    PRESET_TEMPLATES.welcome.highlights
  );
  const [editorColorFrom, setEditorColorFrom] = useState(
    PRESET_TEMPLATES.welcome.colorFrom
  );
  const [editorColorTo, setEditorColorTo] = useState(
    PRESET_TEMPLATES.welcome.colorTo
  );
  const [newHighlight, setNewHighlight] = useState('');

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    const { data } = await supabase
      .from('system_updates')
      .select('*')
      .order('date', { ascending: false });
    if (data) setHistoryUpdates(data);
    setLoadingHistory(false);
  };

  const loadTemplate = (type: 'welcome' | 'new_version' | 'tips') => {
    const template = PRESET_TEMPLATES[type];
    setEditorTitle(template.title);
    setEditorHighlights(template.highlights);
    setEditorColorFrom(template.colorFrom);
    setEditorColorTo(template.colorTo);
    toast.success(
      `Template de ${type === 'welcome' ? 'Boas-vindas' : type === 'tips' ? 'Dicas' : 'Versão'} carregado!`
    );
  };

  const addHighlight = () => {
    if (newHighlight.trim()) {
      setEditorHighlights([...editorHighlights, newHighlight]);
      setNewHighlight('');
    }
  };

  const saveAndPublish = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const response = await fetch('/api/admin/update-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: editorVersion,
          title: editorTitle,
          date: editorDate,
          highlights: editorHighlights,
          colorFrom: editorColorFrom,
          colorTo: editorColorTo,
        }),
      });

      if (!response.ok) throw new Error('Erro ao salvar no servidor');

      setSaveSuccess(true);
      localStorage.removeItem('repvendas_last_seen_version');
      toast.success('Atualização publicada para todos!');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      setSaveError(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 min-h-screen bg-gray-50 dark:bg-slate-950 pb-20">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2 text-primary">
            <Sparkles className="h-8 w-8" />
            <h1 className="text-3xl font-black tracking-tight">
              Comunicador RepVendas
            </h1>
          </div>
          <p className="text-slate-500">
            Controle o que seus representantes visualizam ao entrar no sistema.
          </p>
        </div>

        {/* TEMPLATE SELECTOR */}
        <div className="flex gap-2">
          <button
            onClick={() => loadTemplate('welcome')}
            className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-xl hover:bg-slate-300 transition-all"
          >
            ✨ Template Boas-Vindas
          </button>
          <button
            onClick={() => loadTemplate('new_version')}
            className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-all"
          >
            🚀 Template Novidades
          </button>
          <button
            onClick={() => loadTemplate('tips')}
            className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-amber-100 text-amber-600 rounded-xl hover:bg-amber-200 transition-all"
          >
            💡 Dicas de Uso
          </button>
        </div>
      </header>

      {/* TABS */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setActiveTab('editor')}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${activeTab === 'editor' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-500'}`}
        >
          <LayoutDashboard size={18} /> Editor Visual
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${activeTab === 'history' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-500'}`}
        >
          <Calendar size={18} /> Histórico
        </button>
      </div>

      {activeTab === 'editor' && (
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* FORMULÁRIO */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                <Zap size={16} /> Configurações do Conteúdo
              </h3>

              <div className="space-y-4">
                <input
                  value={editorTitle}
                  onChange={(e) => setEditorTitle(e.target.value)}
                  className="w-full text-xl font-bold p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary"
                  placeholder="Título impactante..."
                />

                <div className="grid grid-cols-2 gap-4">
                  <input
                    value={editorVersion}
                    onChange={(e) => setEditorVersion(e.target.value)}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none"
                    placeholder="Versão (ex: 1.1.0)"
                  />
                  <input
                    type="date"
                    value={editorDate}
                    onChange={(e) => setEditorDate(e.target.value)}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase">
                    Tópicos em Destaque
                  </label>
                  {editorHighlights.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl group"
                    >
                      <span className="flex-1 text-sm font-medium">{h}</span>
                      <button
                        onClick={() =>
                          setEditorHighlights(
                            editorHighlights.filter((_, idx) => idx !== i)
                          )
                        }
                        className="text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-4">
                    <input
                      value={newHighlight}
                      onChange={(e) => setNewHighlight(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addHighlight()}
                      className="flex-1 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm"
                      placeholder="Adicionar novo tópico..."
                    />
                    <button
                      onClick={addHighlight}
                      className="p-3 bg-slate-900 text-white rounded-xl"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={saveAndPublish}
              disabled={saving}
              className="w-full py-5 bg-gradient-to-r from-primary to-blue-700 text-white font-black uppercase tracking-[0.2em] rounded-[2rem] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="animate-spin mx-auto" />
              ) : (
                '🚀 PUBLICAR PARA TODOS OS USUÁRIOS'
              )}
            </button>
          </div>

          {/* PREVIEW AO VIVO (Estilo RepVendas Premium) */}
          <div className="sticky top-8">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform scale-95 origin-top">
              <div
                className="p-10 text-center text-white"
                style={{
                  background: `linear-gradient(135deg, ${editorColorFrom}, ${editorColorTo})`,
                }}
              >
                <Rocket size={48} className="mx-auto mb-6" />
                <h2 className="text-3xl font-black leading-tight mb-2">
                  {editorTitle}
                </h2>
                <span className="px-4 py-1 bg-white/20 rounded-full text-xs font-black uppercase tracking-widest">
                  Versão {editorVersion}
                </span>
              </div>
              <div className="p-10">
                <ul className="space-y-6 mb-10">
                  {editorHighlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-4">
                      <div className="w-2 h-2 mt-2 rounded-full bg-primary flex-shrink-0" />
                      <span className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                        {h}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  className="w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest shadow-lg"
                  style={{ background: editorColorFrom }}
                >
                  Explorar Novidades
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HISTÓRICO (simplificado) */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {loadingHistory ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
          ) : historyUpdates.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              Nenhuma atualização publicada ainda.
            </div>
          ) : (
            historyUpdates.map((u) => (
              <div
                key={u.id}
                className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {u.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                      v{u.version} •{' '}
                      {new Date(u.date).toLocaleDateString('pt-BR')}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {u.highlights?.slice(0, 3).map((h, i) => (
                        <span
                          key={i}
                          className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-300"
                        >
                          {h.substring(0, 50)}
                          {h.length > 50 ? '...' : ''}
                        </span>
                      ))}
                      {u.highlights?.length > 3 && (
                        <span className="text-xs text-slate-400 self-center">
                          + {u.highlights.length - 3} mais
                        </span>
                      )}
                    </div>
                  </div>
                  <CheckCircle2 className="text-green-500" />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
