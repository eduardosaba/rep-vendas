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
  Download,
  Trash2,
  Eye,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

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

        if (data.stats.savings > 0) {
          addLog(
            `💾 Economia atual: ${formatBytes(data.stats.savings)} (${data.stats.savingsPercent.toFixed(1)}%)`
          );
        }
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
    addLog(
      `📦 ${pathsToOptimize.length === 0 ? 'Todas as imagens' : `${pathsToOptimize.length} imagens selecionadas`}`
    );

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

                if (data.type === 'log') {
                  addLog(data.message);
                } else if (data.type === 'progress') {
                  addLog(
                    `⏳ Progresso: ${data.current}/${data.total} - ${data.message}`
                  );
                } else if (data.type === 'complete') {
                  addLog('✨ Otimização concluída!');
                  addLog(
                    `💾 Economia total: ${formatBytes(data.savings)} (${data.savingsPercent.toFixed(1)}%)`
                  );
                  toast.success('Otimização concluída com sucesso!');

                  // Atualiza estatísticas
                  await scanImages();
                  setSelectedImages([]);
                } else if (data.type === 'error') {
                  addLog(`❌ Erro: ${data.message}`);
                  toast.error(data.message);
                }
              } catch (e) {
                console.error('Erro ao parsear linha:', line, e);
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

  const clearLogs = () => {
    setLogs([]);
    addLog('🧹 Console limpo');
  };

  const toggleImageSelection = (path: string) => {
    setSelectedImages((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const selectAllPending = () => {
    const pending = images
      .filter((img) => !img.hasOptimized)
      .map((img) => img.path);
    setSelectedImages(pending);
    addLog(`✅ ${pending.length} imagens pendentes selecionadas`);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="container mx-auto p-4 md:p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-xl">
              <ImageIcon
                className="text-purple-600 dark:text-purple-400"
                size={24}
              />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-slate-50">
                Otimização de Imagens
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Gerencie e otimize as imagens do sistema
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-slate-400">
                  Total
                </span>
                <FileImage size={18} className="text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-slate-50">
                {stats.totalImages}
              </div>
              <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                {formatBytes(stats.originalSize)}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-slate-400">
                  Otimizadas
                </span>
                <CheckCircle size={18} className="text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-slate-50">
                {stats.optimizedImages}
              </div>
              <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                {formatBytes(stats.optimizedSize)}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-slate-400">
                  Pendentes
                </span>
                <AlertCircle size={18} className="text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-slate-50">
                {stats.pendingImages}
              </div>
              <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                Aguardando otimização
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-slate-400">
                  Economia
                </span>
                <HardDrive size={18} className="text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatBytes(stats.savings)}
              </div>
              <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                {stats.savingsPercent.toFixed(1)}% economizado
              </div>
            </div>
          </div>
        )}

        {/* Actions Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 mb-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={scanImages}
              disabled={isScanning || isOptimizing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isScanning ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <RefreshCw size={18} />
              )}
              Escanear
            </button>

            <button
              onClick={() => optimizeImages()}
              disabled={
                isOptimizing || isScanning || stats?.pendingImages === 0
              }
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isOptimizing ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Zap size={18} />
              )}
              Otimizar Tudo
            </button>

            {selectedImages.length > 0 && (
              <button
                onClick={() => optimizeImages(selectedImages)}
                disabled={isOptimizing || isScanning}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Play size={18} />
                Otimizar Selecionadas ({selectedImages.length})
              </button>
            )}

            <button
              onClick={selectAllPending}
              disabled={
                isOptimizing || isScanning || stats?.pendingImages === 0
              }
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <CheckCircle size={18} />
              Selecionar Pendentes
            </button>

            <button
              onClick={clearLogs}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Trash2 size={18} />
              Limpar Console
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Images List */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-slate-800">
              <h2 className="font-bold text-gray-900 dark:text-slate-50 flex items-center gap-2">
                <FileImage size={18} />
                Imagens ({images.length})
              </h2>
            </div>

            <div className="overflow-y-auto max-h-[600px]">
              {images.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-slate-400">
                  <ImageIcon size={48} className="mx-auto mb-4 opacity-20" />
                  <p>Nenhuma imagem encontrada</p>
                  <button
                    onClick={scanImages}
                    className="mt-4 text-blue-600 hover:underline"
                  >
                    Escanear agora
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-slate-800">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className={`p-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${
                        selectedImages.includes(img.path)
                          ? 'bg-blue-50 dark:bg-blue-900/10'
                          : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedImages.includes(img.path)}
                          onChange={() => toggleImageSelection(img.path)}
                          disabled={img.hasOptimized}
                          className="mt-1"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-slate-50 truncate">
                              {img.name}
                            </span>
                            {img.hasOptimized ? (
                              <CheckCircle
                                size={14}
                                className="text-green-600 flex-shrink-0"
                              />
                            ) : (
                              <AlertCircle
                                size={14}
                                className="text-orange-600 flex-shrink-0"
                              />
                            )}
                          </div>

                          <div className="text-xs text-gray-500 dark:text-slate-400">
                            <span>{formatBytes(img.size)}</span>
                            {img.hasOptimized && img.savings && (
                              <span className="ml-2 text-green-600">
                                → {formatBytes(img.optimizedSize!)}
                                <span className="ml-1">
                                  (-
                                  {((img.savings / img.size) * 100).toFixed(0)}
                                  %)
                                </span>
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-gray-400 dark:text-slate-500 truncate mt-1">
                            {img.path}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Console/Logs */}
          <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
            <div className="bg-gray-800 p-3 border-b border-gray-700 flex items-center justify-between">
              <h2 className="font-bold text-gray-100 flex items-center gap-2">
                <Info size={18} />
                Console
              </h2>
              <span className="text-xs text-gray-400">
                {logs.length} mensagens
              </span>
            </div>

            <div className="p-4 h-[600px] overflow-y-auto font-mono text-xs text-green-400 bg-gray-950">
              {logs.length === 0 ? (
                <div className="text-gray-500 italic">
                  Aguardando operações...
                </div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="mb-1 leading-relaxed">
                    {log}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex gap-3">
            <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-2">Como funciona a otimização:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                <li>Converte imagens para WebP (formato moderno e leve)</li>
                <li>Redimensiona para no máximo 1920px de largura</li>
                <li>Gera versões responsivas (320px, 640px, 1024px, 1920px)</li>
                <li>Economia típica: 60-80% do tamanho original</li>
                <li>As imagens originais são preservadas</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
