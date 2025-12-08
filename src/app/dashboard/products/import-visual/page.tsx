'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase as sharedSupabase } from '@/lib/supabaseClient';
import { ImageDropzone } from '@/components/dashboard/ImageDropzone';
import { StagingProductCard } from '@/components/dashboard/StagingProductCard';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Terminal, History } from 'lucide-react';
import Link from 'next/link';

interface StagingImage {
  id: string;
  storage_path: string;
  original_name: string;
  publicUrl: string;
}

export default function ImportVisualPage() {
  const [stagingImages, setStagingImages] = useState<StagingImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Logs (Console)
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const supabase = sharedSupabase;

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const icon = type === 'error' ? '❌ ' : type === 'success' ? '✅ ' : 'ℹ️ ';
    setLogs(prev => [...prev, `${icon}${message}`]);
  };

  // 1. Inicializa Sessão de Histórico
  const ensureHistorySession = async () => {
    if (currentSessionId) return currentSessionId;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('import_history')
        .insert({
          user_id: user.id,
          total_items: 0, 
          brand_summary: 'Importação Visual (Fotos)',
          file_name: 'Upload Manual'
        })
        .select()
        .single();

      if (error) throw error;
      
      setCurrentSessionId(data.id);
      addLog(`Sessão de histórico iniciada.`, 'success');
      return data.id;
    } catch (e: any) {
      console.error(e);
      return null;
    }
  };

  // 2. Carregar imagens
  const fetchStagingImages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('staging_images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const imagesWithUrls = data.map((img) => {
        // Gera URL pública baseada no path salvo
        const { data: { publicUrl } } = supabase.storage
          .from('product-images') 
          .getPublicUrl(img.storage_path);
        return { ...img, publicUrl };
      });

      setStagingImages(imagesWithUrls);
    } catch (error: any) {
      console.error(error);
      addLog(`Erro ao buscar imagens: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStagingImages();
  }, []);

  // 3. Upload de novas imagens (COM ISOLAMENTO POR PASTA)
  const handleUpload = async (files: File[]) => {
    setUploading(true);
    addLog(`Iniciando upload de ${files.length} arquivos...`);
    let successCount = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      await Promise.all(
        files.map(async (file) => {
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
          
          // --- AJUSTE DE ISOLAMENTO SaaS ---
          // Antes: `staging/${fileName}`
          // Agora: `${user.id}/staging/${fileName}`
          // Isso garante que cada usuário tenha sua própria pasta
          const filePath = `${user.id}/staging/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, file);

          if (uploadError) {
            addLog(`Falha no upload de ${file.name}: ${uploadError.message}`, 'error');
            throw uploadError;
          }

          const { error: dbError } = await supabase
            .from('staging_images')
            .insert({
              user_id: user.id,
              storage_path: filePath,
              original_name: file.name,
            });

          if (!dbError) {
            successCount++;
            addLog(`Upload concluído: ${file.name}`, 'success');
          } else {
            addLog(`Erro no banco: ${dbError.message}`, 'error');
          }
        })
      );

      if (successCount > 0) {
        toast.success(`${successCount} fotos enviadas!`);
        fetchStagingImages();
      }
    } catch (error: any) {
      toast.error('Erro no upload');
    } finally {
      setUploading(false);
    }
  };

  // 4. Salvar Produto
  const handleSaveProduct = async (
    id: string,
    data: { name: string; price: string; reference: string }
  ) => {
    try {
      const image = stagingImages.find((img) => img.id === id);
      if (!image) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      addLog(`Salvando produto: ${data.name}...`);

      const historyId = await ensureHistorySession();

      const { error: productError } = await supabase.from('products').insert({
        user_id: user.id,
        name: data.name,
        reference_code: data.reference,
        price: parseFloat(data.price.replace(',', '.')),
        image_url: image.publicUrl, 
        images: [image.publicUrl], 
        image_path: image.storage_path, 
        last_import_id: historyId 
      });

      if (productError) throw productError;

      // Atualiza Histórico
      if (historyId) {
        const { data: currentHist } = await supabase
          .from('import_history')
          .select('total_items')
          .eq('id', historyId)
          .single();
        
        await supabase
          .from('import_history')
          .update({ total_items: (currentHist?.total_items || 0) + 1 })
          .eq('id', historyId);
      }

      // Remove da tabela temporária (mas mantemos o arquivo no storage pois virou produto)
      await supabase.from('staging_images').delete().eq('id', id);

      setStagingImages((prev) => prev.filter((img) => img.id !== id));
      addLog(`Produto criado: ${data.name}`, 'success');
      toast.success('Produto criado!');

    } catch (error: any) {
      console.error(error);
      addLog(`Erro ao salvar: ${error.message}`, 'error');
      toast.error('Erro ao salvar');
    }
  };

  // 5. Deletar Imagem
  const handleDeleteImage = async (id: string) => {
    try {
      const image = stagingImages.find((img) => img.id === id);
      if (!image) return;

      addLog(`Apagando: ${image.original_name}...`);

      await supabase.storage.from('product-images').remove([image.storage_path]);
      await supabase.from('staging_images').delete().eq('id', id);

      setStagingImages((prev) => prev.filter((img) => img.id !== id));
      toast('Imagem descartada');
    } catch (error: any) {
      console.error(error);
      addLog(`Erro ao deletar: ${error.message}`, 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 pb-20 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/products"
            className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Importação Visual
            </h1>
            <p className="text-sm text-gray-500">
              Transforme fotos em produtos rapidamente
            </p>
          </div>
        </div>
        
        <Link 
          href="/dashboard/products/import-history" 
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary transition-colors border px-3 py-2 rounded-lg hover:bg-gray-50"
        >
          <History size={16} />
          Ver Histórico
        </Link>
      </div>

      {/* Upload */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">
          1. Envie suas fotos
        </h3>
        {uploading ? (
          <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-indigo-100 bg-indigo-50 text-indigo-600 rounded-lg">
            <Loader2 size={32} className="animate-spin mb-2" />
            <p className="font-medium">Enviando para sua galeria segura...</p>
          </div>
        ) : (
          <ImageDropzone onDrop={handleUpload} />
        )}
      </div>

      {/* Console */}
      {(logs.length > 0 || uploading) && (
        <div className="bg-gray-900 text-green-400 p-4 rounded-md text-xs font-mono shadow-inner border border-gray-700 max-h-40 overflow-y-auto">
          <div className="mb-2 text-gray-500 border-b border-gray-700 pb-1 font-bold flex items-center gap-2">
            <Terminal size={14} /> LOG DE ATIVIDADE
          </div>
          {logs.map((log, index) => (
            <div key={index} className="truncate py-0.5 border-b border-gray-800/50 last:border-0 font-mono">
              <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString()}]</span>
              {log}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      )}

      {/* Grid */}
      {stagingImages.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">
              2. Preencha os dados ({stagingImages.length} pendentes)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {stagingImages.map((img) => (
              <StagingProductCard
                key={img.id}
                id={img.id}
                imageUrl={img.publicUrl}
                originalName={img.original_name}
                onSave={handleSaveProduct}
                onDelete={handleDeleteImage}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}