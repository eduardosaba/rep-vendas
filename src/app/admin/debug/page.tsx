'use client';

import { useState } from 'react';
import {
  Code,
  Save,
  AlertTriangle,
  FileText,
  Terminal,
  Loader2,
  CheckCircle,
  Info,
  Search,
  FileWarning,
} from 'lucide-react';
import { toast } from 'sonner';

export default function DebugPage() {
  // Usamos `sonner` diretamente aqui para evitar depender do contexto
  // global (algumas páginas de debug/IDE rodam fora do provider).

  const [formData, setFormData] = useState({
    path: 'src/app/',
    description: '',
    code: '',
  });

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    path?: string;
  } | null>(null);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  const handleSave = async () => {
    if (!formData.path.includes('.')) {
      toast.warning('Caminho inválido', {
        description: 'Inclua a extensão (ex: .tsx)',
      });
      return;
    }

    setLoading(true);
    setVerifyResult(null); // Limpa verificação anterior
    try {
      const resp = await fetch('/api/admin/debug/save-system-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: formData.path, content: formData.code }),
      });
      const result = await resp.json();

      if (result.success) {
        toast.success('Sucesso!', {
          description: 'Arquivo criado ou substituído.',
        });
        setLastResult({ success: true, path: formData.path });
      } else {
        toast.error('Erro', { description: result.error });
        setLastResult({ success: false });
      }
    } catch (e) {
      toast.error('Erro fatal');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!lastResult?.path) return;

    setVerifying(true);
    try {
      const resp = await fetch('/api/admin/debug/verify-system-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: lastResult.path }),
      });
      const result = await resp.json();

      if (result.success) {
        setVerifyResult(
          `✅ Confirmado: Arquivo existe (${result.size} bytes). Modificado em: ${result.lastModified}`
        );
        toast.success('Integridade OK');
      } else {
        setVerifyResult(`❌ Erro: ${result.error}`);
        toast.error('Falha na verificação', { description: result.error });
      }
    } catch (e) {
      setVerifyResult('❌ Erro de conexão ao verificar.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1e1e1e] text-gray-300 p-6 font-mono">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-900/30 p-2 rounded-lg border border-green-500/30">
              <Terminal className="text-green-500" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                System Builder v1.0
              </h1>
              <p className="text-xs text-gray-500">
                Ambiente de Desenvolvimento Integrado (IDE)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-900/20 px-3 py-1.5 rounded border border-orange-500/30">
            <AlertTriangle size={14} />
            <span>Modo DEV: Gravação Física</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna de Configuração */}
          <div className="space-y-6">
            {/* Card Caminho */}
            <div className="bg-[#252526] p-4 rounded-xl border border-gray-700 shadow-lg">
              <label className="text-sm font-bold text-gray-400 mb-2 flex items-center gap-2">
                <FileText size={14} /> CAMINHO (PATH)
              </label>
              <input
                type="text"
                value={formData.path}
                onChange={(e) =>
                  setFormData({ ...formData, path: e.target.value })
                }
                className="w-full bg-[#1e1e1e] border border-gray-600 rounded-lg p-3 text-sm text-green-400 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none font-mono"
                placeholder="src/app/exemplo/page.tsx"
              />
            </div>

            {/* Card Descrição */}
            <div className="bg-[#252526] p-4 rounded-xl border border-gray-700 shadow-lg">
              <label className="text-sm font-bold text-gray-400 mb-2 flex items-center gap-2">
                <Info size={14} /> NOTAS
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full bg-[#1e1e1e] border border-gray-600 rounded-lg p-3 text-sm text-gray-300 focus:border-blue-500 outline-none resize-none h-20"
                placeholder="O que este código faz?"
              />
            </div>

            {/* Ações */}
            <div className="space-y-3">
              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Save size={20} />
                )}
                {loading ? 'GRAVANDO...' : 'SALVAR / SUBSTITUIR'}
              </button>

              <p className="text-[10px] text-center text-gray-500 flex items-center justify-center gap-1">
                <FileWarning size={10} className="text-orange-500" />
                Atenção: Se o arquivo existir, será substituído.
              </p>

              {/* Painel de Status e Verificação */}
              {lastResult?.success && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-2">
                  <div className="p-3 rounded-lg bg-green-900/20 border border-green-500/50 text-center">
                    <span className="text-green-400 font-bold text-sm flex items-center justify-center gap-2">
                      <CheckCircle size={16} /> Arquivo Gravado
                    </span>
                  </div>

                  <button
                    onClick={handleVerify}
                    disabled={verifying}
                    className="w-full py-3 bg-[#333] hover:bg-[#444] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-gray-600"
                  >
                    {verifying ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <Search size={18} />
                    )}
                    VERIFICAR NO DISCO
                  </button>

                  {verifyResult && (
                    <div className="p-3 bg-black/50 rounded-lg border border-gray-700 text-xs text-gray-300 font-mono break-words">
                      {verifyResult}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Coluna de Código */}
          <div className="lg:col-span-2 flex flex-col h-[600px] bg-[#252526] rounded-xl border border-gray-700 overflow-hidden shadow-2xl">
            <div className="bg-[#1e1e1e] border-b border-gray-700 p-3 flex items-center justify-between px-4">
              <span className="text-xs font-bold text-gray-400 flex items-center gap-2">
                <Code size={14} /> EDITOR
              </span>
              <span className="text-xs text-gray-600">
                Cole o código completo para substituição
              </span>
            </div>
            <textarea
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value })
              }
              className="flex-1 w-full bg-[#1e1e1e] text-gray-300 font-mono text-sm p-4 outline-none resize-none leading-relaxed selection:bg-blue-500/30"
              placeholder="// Cole seu código React/TSX completo aqui..."
              spellCheck={false}
              style={{ tabSize: 2 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
