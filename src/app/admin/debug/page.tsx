'use client';

import { useState } from 'react';
import {
  Code,
  Save,
  AlertTriangle,
  Terminal,
  Loader2,
  CheckCircle,
  Info,
  Search,
  Activity,
  Server,
  Download,
  Play,
  FileJson,
  Layout
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  saveSystemFile, 
  verifySystemFile, 
  readSystemFile, 
  getSystemLogs,
  runSystemDiagnostics
} from './actions';

export default function DebugPage() {
  const [activeTab, setActiveTab] = useState<'editor' | 'logs' | 'tests'>('editor');

  // --- ESTADOS DO EDITOR ---
  const [formData, setFormData] = useState({
    path: 'src/app/',
    description: '',
    code: '',
  });
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; path?: string } | null>(null);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  // --- ESTADOS DE LOGS E TESTES ---
  const [logs, setLogs] = useState<string>('Clique em "Carregar Logs" para visualizar...');
  const [diagnostics, setDiagnostics] = useState<any>(null);

  // --- HANDLERS DO EDITOR ---
  const handleLoad = async () => {
    setLoading(true);
    const res = await readSystemFile(formData.path);
    if (res.success && res.content) {
      setFormData(prev => ({ ...prev, code: res.content }));
      toast.success('Arquivo carregado!');
    } else {
      toast.error(res.error || 'Erro ao ler arquivo');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.path.includes('.')) {
      toast.warning('Caminho inválido. Inclua a extensão (ex: .tsx)');
      return;
    }
    setLoading(true);
    setVerifyResult(null);
    
    const res = await saveSystemFile(formData.path, formData.code);

    if (res.success) {
      toast.success('Sucesso!', { description: 'Arquivo gravado no disco.' });
      setLastResult({ success: true, path: formData.path });
    } else {
      toast.error('Erro', { description: res.error });
      setLastResult({ success: false });
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (!lastResult?.path) return;
    const res = await verifySystemFile(lastResult.path);
    if (res.success) {
      setVerifyResult(`✅ Confirmado: ${res.size} bytes. Modificado: ${res.lastModified}`);
      toast.success('Integridade OK');
    } else {
      setVerifyResult(`❌ Erro: ${res.error}`);
      toast.error('Falha', { description: res.error });
    }
  };

  // --- HANDLERS DE LOGS/TESTES ---
  const handleLoadLogs = async () => {
    setLoading(true);
    const res = await getSystemLogs();
    setLogs(res.success ? (res.logs || 'Sem logs') : 'Erro ao buscar logs');
    setLoading(false);
  };

  const handleRunDiagnostics = async () => {
    setLoading(true);
    const res = await runSystemDiagnostics();
    if (res.success) {
        setDiagnostics(res.data);
        toast.success('Diagnóstico concluído');
    } else {
        toast.error('Erro no diagnóstico');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#1e1e1e] text-gray-300 font-mono flex flex-col">
      
      {/* HEADER FIXO - REDESENHADO PARA VISIBILIDADE */}
      <div className="bg-[#252526] border-b border-gray-700 px-6 py-4 flex flex-col md:flex-row items-center justify-between sticky top-0 z-10 shadow-md gap-4">
        
        {/* Lado Esquerdo: Logo */}
        <div className="flex items-center gap-4">
          <div className="bg-green-900/30 p-2 rounded-lg border border-green-500/30">
            <Terminal className="text-green-500" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              System Builder <span className="text-[10px] bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">v2.0</span>
            </h1>
            <p className="text-xs text-gray-500">IDE & Diagnóstico Remoto</p>
          </div>
        </div>

        {/* Centro: Navegação (ABAS VISÍVEIS) */}
        <div className="flex items-center bg-black/40 p-1 rounded-lg border border-gray-700/50">
            <button 
                onClick={() => setActiveTab('editor')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                    activeTab === 'editor' 
                    ? 'bg-green-600 text-white shadow-sm' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
                <Code size={14} /> Editor
            </button>
            <button 
                onClick={() => setActiveTab('logs')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                    activeTab === 'logs' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
                <Activity size={14} /> Logs
            </button>
            <button 
                onClick={() => setActiveTab('tests')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                    activeTab === 'tests' 
                    ? 'bg-purple-600 text-white shadow-sm' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
                <Layout size={14} /> Diagnóstico
            </button>
        </div>

        {/* Lado Direito: Aviso */}
        <div className="hidden md:flex items-center gap-2 text-xs text-orange-400 bg-orange-900/20 px-3 py-1.5 rounded border border-orange-500/30 animate-pulse">
          <AlertTriangle size={14} />
          <span>AMBIENTE R/W</span>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
        
        {/* --- ABA 1: EDITOR --- */}
        {activeTab === 'editor' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {/* Coluna Config */}
            <div className="space-y-6">
                <div className="bg-[#252526] p-4 rounded-xl border border-gray-700 shadow-lg">
                <label className="text-sm font-bold text-gray-400 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2"><Code size={14} /> CAMINHO (PATH)</span>
                    <button onClick={handleLoad} className="text-[10px] bg-blue-600/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-600/40">
                        CARREGAR
                    </button>
                </label>
                <input
                    type="text"
                    value={formData.path}
                    onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                    className="w-full bg-[#1e1e1e] border border-gray-600 rounded-lg p-3 text-sm text-green-400 focus:border-green-500 outline-none font-mono"
                    placeholder="src/app/..."
                />
                </div>

                <div className="bg-[#252526] p-4 rounded-xl border border-gray-700 shadow-lg">
                <label className="text-sm font-bold text-gray-400 mb-2 flex items-center gap-2">
                    <Info size={14} /> NOTAS
                </label>
                <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-[#1e1e1e] border border-gray-600 rounded-lg p-3 text-sm text-gray-300 outline-none resize-none h-24"
                    placeholder="Documentação rápida..."
                />
                </div>

                <div className="space-y-3">
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-blue-900/20 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                    {loading ? 'PROCESSANDO...' : 'SALVAR NO DISCO'}
                </button>

                {lastResult?.success && (
                    <div className="space-y-2">
                    <div className="p-3 rounded-lg bg-green-900/20 border border-green-500/50 text-center text-green-400 font-bold text-sm flex items-center justify-center gap-2">
                        <CheckCircle size={16} /> Gravado com Sucesso
                    </div>
                    <button
                        onClick={handleVerify}
                        className="w-full py-2 bg-[#333] hover:bg-[#444] text-white rounded-lg flex items-center justify-center gap-2 border border-gray-600 text-xs"
                    >
                        <Search size={14} /> Verificar Integridade
                    </button>
                    {verifyResult && (
                        <div className="p-3 bg-black/50 rounded-lg border border-gray-700 text-[10px] text-gray-300 break-words">
                        {verifyResult}
                        </div>
                    )}
                    </div>
                )}
                </div>
            </div>

            {/* Coluna Código */}
            <div className="lg:col-span-2 flex flex-col h-[700px] bg-[#252526] rounded-xl border border-gray-700 overflow-hidden shadow-2xl">
                <div className="bg-[#1e1e1e] border-b border-gray-700 p-3 flex items-center justify-between px-4">
                <span className="text-xs font-bold text-gray-400 flex items-center gap-2">
                    <Code size={14} /> EDITOR DE CÓDIGO
                </span>
                <span className="text-[10px] text-gray-500 uppercase">TypeScript / React</span>
                </div>
                <textarea
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="flex-1 w-full bg-[#1e1e1e] text-gray-300 font-mono text-sm p-4 outline-none resize-none leading-relaxed"
                spellCheck={false}
                />
            </div>
            </div>
        )}

        {/* --- ABA 2: LOGS --- */}
        {activeTab === 'logs' && (
            <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in duration-300">
                <div className="flex justify-between items-center bg-[#252526] p-4 rounded-t-xl border border-gray-700">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Activity size={20} className="text-blue-500" /> Logs do Servidor
                    </h2>
                    <button 
                        onClick={handleLoadLogs}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={14}/> : <Download size={14} />}
                        ATUALIZAR
                    </button>
                </div>
                <div className="bg-black/80 p-6 rounded-b-xl border border-t-0 border-gray-700 h-[600px] overflow-auto font-mono text-xs text-green-400 whitespace-pre-wrap shadow-inner">
                    {logs}
                </div>
            </div>
        )}

        {/* --- ABA 3: TESTES --- */}
        {activeTab === 'tests' && (
             <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
                 <div className="bg-[#252526] p-6 rounded-xl border border-gray-700">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Server size={20} className="text-purple-500" /> Diagnóstico de Sistema
                        </h2>
                        <button 
                            onClick={handleRunDiagnostics}
                            disabled={loading}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18}/> : <Play size={18} />}
                            EXECUTAR DIAGNÓSTICO
                        </button>
                    </div>

                    {!diagnostics ? (
                        <div className="text-center p-12 text-gray-500 border border-dashed border-gray-700 rounded-lg">
                            Clique em Executar para iniciar os testes de conexão.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-[#1e1e1e] rounded-lg border border-gray-700">
                                <span className="text-xs text-gray-500 uppercase font-bold">Banco de Dados</span>
                                <div className="text-lg mt-1 text-white">{diagnostics.database}</div>
                            </div>
                            <div className="p-4 bg-[#1e1e1e] rounded-lg border border-gray-700">
                                <span className="text-xs text-gray-500 uppercase font-bold">Variáveis de Ambiente</span>
                                <div className="text-lg mt-1 text-white">{diagnostics.env}</div>
                            </div>
                            <div className="p-4 bg-[#1e1e1e] rounded-lg border border-gray-700">
                                <span className="text-xs text-gray-500 uppercase font-bold">Node Version</span>
                                <div className="text-lg mt-1 text-gray-300 font-mono">{diagnostics.nodeVersion}</div>
                            </div>
                            <div className="p-4 bg-[#1e1e1e] rounded-lg border border-gray-700">
                                <span className="text-xs text-gray-500 uppercase font-bold">Plataforma</span>
                                <div className="text-lg mt-1 text-gray-300 font-mono">{diagnostics.platform}</div>
                            </div>
                             <div className="col-span-full p-4 bg-[#1e1e1e] rounded-lg border border-gray-700">
                                <span className="text-xs text-gray-500 uppercase font-bold mb-2 block flex items-center gap-2">
                                    <FileJson size={14}/> Dump Completo
                                </span>
                                <pre className="text-[10px] text-gray-500 overflow-auto max-h-40">
                                    {JSON.stringify(diagnostics, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                 </div>
             </div>
        )}

      </div>
    </div>
  );
}