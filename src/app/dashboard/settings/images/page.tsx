'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Image as ImageIcon,
  Play,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Zap,
  HardDrive,
  FileImage,
  Loader2,
  Trash2,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

// 1. Definição correta das Interfaces
interface ImageStats {
  totalImages: number;
  optimizedImages: number;
  pendingImages: number;
  originalSize: number;
  optimizedSize: number;
  savings: number;
  savingsPercent: number;
}

interface ImageFile {
  path: string;
  name: string;
  size: number;
  hasOptimized: boolean;
  optimizedPath?: string;
  optimizedSize?: number;
  savings?: number;
}

export default function ImageOptimizationPage() {
  // 2. Estados movidos para dentro do componente
  const [stats, setStats] = useState<ImageStats | null>(null);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Carrega estatísticas ao montar
  useEffect(() => {
    scanImages();
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const scanImages = async () => {
    setIsScanning(true);
    addLog('🔍 Iniciando varredura de imagens...');

    try {
      const response = await fetch('/api/admin/images/scan');
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
        setImages(data.images);
        addLog(`✅ Encontradas ${data.stats.totalImages} imagens`);
        addLog(
          `📊 ${data.stats.optimizedImages} já otimizadas, ${data.stats.pendingImages} pendentes`
        );
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      addLog(
        `❌ Erro ao escanear: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
      toast.error('Erro ao escanear imagens');
    } finally {
      setIsScanning(false);
    }
  };

  const optimizeImages = async (imagePaths?: string[]) => {
    setIsOptimizing(true);
    const pathsToOptimize = imagePaths || selectedImages;

    addLog('🚀 Iniciando otimização...');

    try {
      const response = await fetch('/api/admin/images/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: pathsToOptimize.length > 0 ? pathsToOptimize : undefined,
        }),
      });

      if (!response.ok) throw new Error('Erro na otimização');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n').filter(Boolean);

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'log') addLog(data.message);
                if (data.type === 'progress')
                  addLog(
                    `⏳ Progresso: ${data.current}/${data.total} - ${data.message}`
                  );
                if (data.type === 'complete') {
                  addLog('✨ Otimização concluída!');
                  toast.success('Otimização concluída com sucesso!');
                  await scanImages();
                  setSelectedImages([]);
                }
              } catch (e) {
                console.error(e);
              }
            }
          }
        }
      }
    } catch (error) {
      addLog(
        `❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
      toast.error('Erro ao otimizar imagens');
    } finally {
      setIsOptimizing(false);
    }
  };

  const toggleImageSelection = (path: string) => {
    setSelectedImages((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-xl">
            <ImageIcon
              className="text-purple-600 dark:text-purple-400"
              size={24}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-50">
              Otimização de Imagens
            </h1>
            <p className="text-sm text-gray-500">
              Reduza o tamanho das imagens para carregar o catálogo mais rápido.
            </p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Total"
              value={stats.totalImages}
              subValue={formatBytes(stats.originalSize)}
              icon={FileImage}
              color="blue"
            />
            <StatCard
              title="Otimizadas"
              value={stats.optimizedImages}
              subValue={formatBytes(stats.optimizedSize)}
              icon={CheckCircle}
              color="green"
            />
            <StatCard
              title="Pendentes"
              value={stats.pendingImages}
              subValue="Aguardando"
              icon={AlertCircle}
              color="orange"
            />
            <StatCard
              title="Economia"
              value={formatBytes(stats.savings)}
              subValue={`${stats.savingsPercent.toFixed(1)}% economizado`}
              icon={HardDrive}
              color="purple"
            />
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex flex-wrap gap-3 mb-6 bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800">
          <button
            onClick={scanImages}
            disabled={isScanning || isOptimizing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isScanning ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <RefreshCw size={18} />
            )}{' '}
            Escanear
          </button>
          <button
            onClick={() => optimizeImages()}
            disabled={isOptimizing || isScanning || stats?.pendingImages === 0}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {isOptimizing ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Zap size={18} />
            )}{' '}
            Otimizar Tudo
          </button>
          <button
            onClick={() => setLogs([])}
            className="ml-auto flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-gray-700"
          >
            <Trash2 size={18} /> Limpar Console
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista de Imagens */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 h-[600px] flex flex-col overflow-hidden">
            <div className="p-4 border-b dark:border-slate-800 font-bold">
              Imagens ({images.length})
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-lg border-b dark:border-slate-800 last:border-0"
                >
                  <input
                    type="checkbox"
                    checked={selectedImages.includes(img.path)}
                    onChange={() => toggleImageSelection(img.path)}
                    disabled={img.hasOptimized}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {img.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatBytes(img.size)}{' '}
                      {img.hasOptimized &&
                        `→ ${formatBytes(img.optimizedSize!)}`}
                    </div>
                  </div>
                  {img.hasOptimized ? (
                    <CheckCircle size={16} className="text-green-500" />
                  ) : (
                    <AlertCircle size={16} className="text-orange-500" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Console */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 h-[600px] flex flex-col overflow-hidden">
            <div className="p-4 bg-gray-800 text-gray-200 font-mono text-xs flex justify-between items-center">
              <span>Console de Otimização</span>
              <span className="text-[10px] opacity-50">
                {logs.length} linhas
              </span>
            </div>
            <div className="flex-1 p-4 font-mono text-[11px] text-green-400 overflow-y-auto space-y-1 bg-black">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente Interno para os Cards de Status
function StatCard({ title, value, subValue, icon: Icon, color }: any) {
  const colors: any = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    orange: 'text-orange-600 bg-orange-50',
    purple: 'text-purple-600 bg-purple-50',
  };
  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          {title}
        </span>
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-[10px] text-gray-500 mt-1">{subValue}</div>
    </div>
  );
}
