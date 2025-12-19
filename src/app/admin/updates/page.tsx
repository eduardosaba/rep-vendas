'use client';

import React, { useState } from 'react';
import {
  Rocket,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Code,
} from 'lucide-react';
// Nota: não precisamos de LATEST_UPDATE nesta página (preview foi removido)

type UpdateType = 'feature' | 'improvement' | 'bugfix';

interface UpdateItem {
  id: number;
  version: string;
  date: string;
  type: UpdateType;
  title: string;
  description: string;
  status: 'completed' | 'in-progress';
}

export default function AdminUpdatesPage() {
  const currentVersion = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Estados do editor visual
  const [editorTitle, setEditorTitle] = useState(
    '🎉 Bem-vindo ao RepVendas 1.0!'
  );
  const [editorVersion, setEditorVersion] = useState(currentVersion);
  const [editorDate, setEditorDate] = useState('2024-12-19');
  const [editorHighlights, setEditorHighlights] = useState([
    '🎨 Sistema de temas personalizáveis',
    '📄 Geração de PDF otimizada',
    '🚀 Interface administrativa completa',
  ]);
  const [editorColorFrom, setEditorColorFrom] = useState('#0d1b2c');
  const [editorColorTo, setEditorColorTo] = useState('#b9722e');
  const [newHighlight, setNewHighlight] = useState('');

  const updates: UpdateItem[] = [
    {
      id: 1,
      version: '1.0.0',
      date: '2024-12-19',
      type: 'feature',
      title: 'Sistema de Temas Personalizados',
      description:
        'Implementação completa do sistema de cores personalizáveis com suporte a temas pré-definidos.',
      status: 'completed',
    },
    {
      id: 2,
      version: '1.0.0',
      date: '2024-12-19',
      type: 'improvement',
      title: 'Otimização de Geração de PDF',
      description:
        'Melhorias na compressão de imagens e redução do tamanho dos arquivos PDF gerados.',
      status: 'completed',
    },
    {
      id: 3,
      version: '1.0.0',
      date: '2024-12-19',
      type: 'feature',
      title: 'Barra de Progresso em PDF',
      description:
        'Adição de barra de progresso em tempo real durante a geração de catálogos PDF.',
      status: 'completed',
    },
  ];

  // getTypeColor removed — não é mais usado na versão simplificada do Histórico

  const getStatusIcon = (
    status: UpdateItem['status']
  ): React.ReactElement | null => {
    switch (status) {
      case 'completed':
        return (
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
        );
      case 'in-progress':
        return (
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        );
      default:
        return null;
    }
  };

  const addHighlight = () => {
    if (newHighlight.trim()) {
      setEditorHighlights([...editorHighlights, newHighlight]);
      setNewHighlight('');
    }
  };

  const removeHighlight = (index: number) => {
    setEditorHighlights(editorHighlights.filter((_, i) => i !== index));
  };

  const saveAndPublish = async () => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const response = await fetch('/api/admin/update-version', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: editorVersion,
          title: editorTitle,
          date: editorDate,
          highlights: editorHighlights,
          colorFrom: editorColorFrom,
          colorTo: editorColorTo,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);

      // Recarregar a página após 2 segundos para aplicar mudanças
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : 'Erro desconhecido'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 animate-in fade-in duration-500 min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Rocket className="h-8 w-8 text-[var(--primary)]" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Gerenciar Atualizações
          </h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400">
          Configure e visualize as notificações de atualização do sistema
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('editor')}
          className={`px-4 py-2 font-medium transition-colors relative whitespace-nowrap ${
            activeTab === 'editor'
              ? 'text-[var(--primary)]'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Code className="inline-block w-4 h-4 mr-2" />
          Editor Visual
          {activeTab === 'editor' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 font-medium transition-colors relative whitespace-nowrap ${
            activeTab === 'history'
              ? 'text-[var(--primary)]'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Calendar className="inline-block w-4 h-4 mr-2" />
          Histórico
          {activeTab === 'history' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />
          )}
        </button>
      </div>

      {/* Tab Content: Editor Visual */}
      {activeTab === 'editor' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Formulário de Edição */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                ✏️ Editar Conteúdo
              </h3>

              <div className="space-y-4">
                {/* Título */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Título do Popup
                  </label>
                  <input
                    type="text"
                    value={editorTitle}
                    onChange={(e) => setEditorTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                    placeholder="🎉 Título da atualização"
                  />
                </div>

                {/* Versão */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Versão
                    </label>
                    <input
                      type="text"
                      value={editorVersion}
                      onChange={(e) => setEditorVersion(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                      placeholder="1.0.0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Data
                    </label>
                    <input
                      type="date"
                      value={editorDate}
                      onChange={(e) => setEditorDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Novidades */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Novidades (Highlights)
                  </label>
                  <div className="space-y-2 mb-3">
                    {editorHighlights.map((highlight, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 p-2 rounded-lg"
                      >
                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                          {highlight}
                        </span>
                        <button
                          onClick={() => removeHighlight(index)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newHighlight}
                      onChange={(e) => setNewHighlight(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addHighlight()}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                      placeholder="✨ Nova funcionalidade..."
                    />
                    <button
                      onClick={addHighlight}
                      className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    💡 Dica: Use emojis no início (🎨 📄 🚀 ⚡ 🔒)
                  </p>
                </div>
              </div>
            </div>

            {/* Cores */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                🎨 Personalizar Cores
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cor Inicial
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={editorColorFrom}
                      onChange={(e) => setEditorColorFrom(e.target.value)}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editorColorFrom}
                      onChange={(e) => setEditorColorFrom(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cor Final
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={editorColorTo}
                      onChange={(e) => setEditorColorTo(e.target.value)}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editorColorTo}
                      onChange={(e) => setEditorColorTo(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                </div>
              </div>

              <div
                className="mt-4 h-12 rounded-lg"
                style={{
                  background: `linear-gradient(to right, ${editorColorFrom}, ${editorColorTo})`,
                }}
              />
            </div>

            {/* Botão Salvar & Publicar */}
            {saveSuccess && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-300 flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <strong>Atualização publicada com sucesso!</strong> A página
                  será recarregada...
                </p>
              </div>
            )}

            {saveError && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-300">
                  <strong>Erro:</strong> {saveError}
                </p>
              </div>
            )}

            <button
              onClick={saveAndPublish}
              disabled={saving || saveSuccess}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Salvando...
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 size={20} />
                  Publicado!
                </>
              ) : (
                <>
                  <Rocket size={20} />
                  Salvar & Publicar Atualização
                </>
              )}
            </button>

            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              🔒 Isso atualizará automaticamente package.json, .env.local e o
              arquivo de configuração.
              <br />
              Todos os usuários verão o popup ao fazer login.
            </p>
          </div>

          {/* Preview Ao Vivo */}
          <div className="lg:sticky lg:top-6 h-fit">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
              {/* Header Dinâmico */}
              <div
                className="relative p-6 rounded-t-2xl"
                style={{
                  background: `linear-gradient(to right, ${editorColorFrom}, ${editorColorTo})`,
                }}
              >
                <div className="flex items-center gap-3 text-white">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    {/* Logo RepVendas (hosted) - fallback para iniciais se falhar */}
                    <img
                      src="https://aawghxjbipcqefmikwby.supabase.co/storage/v1/object/public/logos/logos/repvendas.svg"
                      alt="RepVendas"
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        const next =
                          img.nextElementSibling as HTMLElement | null;
                        if (next) next.style.display = 'flex';
                        img.style.display = 'none';
                      }}
                    />
                    <div
                      className="w-8 h-8 items-center justify-center bg-white/20 rounded text-sm font-semibold text-slate-900 dark:text-white"
                      style={{ display: 'none' }}
                    >
                      RV
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{editorTitle}</h2>
                    <p className="text-white/90 text-sm mt-1">
                      Versão {editorVersion} •{' '}
                      {new Date(editorDate).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content Dinâmico */}
              <div className="p-6">
                <h3 className="font-semibold text-lg mb-4 text-slate-900 dark:text-white">
                  O que há de novo:
                </h3>

                <ul className="space-y-3 mb-6">
                  {editorHighlights.map((highlight, index) => {
                    // Separa emoji do texto de forma mais robusta
                    const emojiMatch = highlight.match(
                      /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)\s*/u
                    );
                    const emoji = emojiMatch ? emojiMatch[0].trim() : '✓';
                    const text = emojiMatch
                      ? highlight.slice(emojiMatch[0].length)
                      : highlight;

                    return (
                      <li
                        key={index}
                        className="flex items-start gap-3 text-slate-700 dark:text-slate-300"
                      >
                        <span className="text-lg mt-0.5">{emoji}</span>
                        <span className="flex-1">{text}</span>
                      </li>
                    );
                  })}
                </ul>

                <div className="flex justify-center">
                  <button
                    className="px-8 py-2.5 rounded-lg text-white font-medium transition-all shadow-lg hover:shadow-xl"
                    style={{
                      background: `linear-gradient(to right, ${editorColorFrom}, ${editorColorTo})`,
                    }}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
              👁️ Preview em tempo real
            </p>
          </div>
        </div>
      )}

      {/* Tab Content: History */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {updates.map((u) => (
            <div
              key={u.id}
              className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {u.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    v{u.version} •{' '}
                    {new Date(u.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>{getStatusIcon(u.status)}</div>
              </div>
            </div>
          ))}

          <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300">
                Próximas Atualizações
              </h3>
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                Versão Atual: v{currentVersion}
              </span>
            </div>
            <ul className="list-disc list-inside text-blue-800 dark:text-blue-400 space-y-1">
              <li>Integração com APIs de terceiros</li>
              <li>Dashboard de analytics avançado</li>
              <li>Sistema de notificações em tempo real</li>
              <li>Exportação de relatórios em múltiplos formatos</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
