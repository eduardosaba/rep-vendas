'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { ImageDropzone } from '@/components/dashboard/ImageDropzone';
import { StagingProductCard } from '@/components/dashboard/StagingProductCard';
import { toast } from 'sonner';
import { useConfirm } from '@/hooks/useConfirm';
import {
  ArrowLeft,
  Loader2,
  Terminal,
  History,
  UploadCloud,
  Info,
} from 'lucide-react';

// --- TIPAGEM ---
interface StagingImage {
  id: string;
  storage_path: string;
  original_name: string;
  publicUrl: string;
}

interface LogMessage {
  id: string;
  text: string;
  type: 'info' | 'error' | 'success';
  timestamp: string;
}

// --- SUB-COMPONENTE: Console de Logs ---
const LogConsole = ({ logs }: { logs: LogMessage[] }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (logs.length === 0) return null;

  return (
    <div className="bg-gray-900 text-green-400 p-4 rounded-xl text-xs font-mono shadow-inner border border-gray-800 max-h-48 overflow-y-auto animate-in slide-in-from-top-2">
      <div className="mb-2 text-gray-500 border-b border-gray-800 pb-2 font-bold flex items-center gap-2 sticky top-0 bg-gray-900 z-10">
        <Terminal size={14} /> LOG DE ATIVIDADE
      </div>
      <div className="space-y-1">
        {logs.map((log) => (
          <div
            key={log.id}
            className="truncate py-0.5 border-b border-gray-800/50 last:border-0 flex items-center gap-2"
          >
            <span className="opacity-40 select-none">[{log.timestamp}]</span>
            <span
              className={
                log.type === 'error'
                  ? 'text-red-400'
                  : log.type === 'success'
                    ? 'text-green-300'
                    : 'text-gray-300'
              }
            >
              {log.type === 'error'
                ? '❌'
                : log.type === 'success'
                  ? '✅'
                  : 'ℹ️'}{' '}
              {log.text}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};

// Utility: generate variant via canvas (returns Blob)
async function generateVariant(file: File, maxWidth: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(1, maxWidth / img.width);
        const width = Math.round(img.width * ratio);
        const height = Math.round(img.height * ratio);

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context unavailable'));
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed'));
          },
          'image/webp',
          0.8
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

// --- PÁGINA PRINCIPAL ---
export default function ImportVisualPage() {
  const supabase = createClient();
  const { usage, canCreate, refetch: refetchLimits } = usePlanLimits();

  // Estados
  const [stagingImages, setStagingImages] = useState<StagingImage[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);

  // --- Helpers ---
  const addLog = useCallback(
    (message: string, type: 'info' | 'error' | 'success' = 'info') => {
      setLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substr(2, 9),
          text: message,
          type,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    },
    []
  );

  // 1. Inicializa Sessão de Histórico (Memoized)
  const ensureHistorySession = useCallback(async () => {
    if (currentSessionId) return currentSessionId;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('import_history')
        .insert({
          user_id: user.id,
          total_items: 0,
          brand_summary: 'Importação Visual (Fotos)',
          file_name: 'Upload Manual',
        })
        .select()
        .maybeSingle();

      if (error) throw error;

      setCurrentSessionId(data.id);
      addLog(
        `Sessão de histórico iniciada (ID: ${data.id.slice(0, 8)}).`,
        'success'
      );
      return data.id;
    } catch (e: any) {
      console.error(e);
      return null;
    }
  }, [currentSessionId, supabase, addLog]);

  // 2. Carregar imagens (Memoized)
  const fetchStagingImages = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('staging_images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const imagesWithUrls = data.map((img) => {
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(img.storage_path);
        const ts = img.created_at
          ? new Date(img.created_at).getTime()
          : Date.now();
        const publicUrl = `${urlData.publicUrl}?t=${ts}`;
        return { ...img, publicUrl };
      });

      setStagingImages(imagesWithUrls);
    } catch (error: any) {
      console.error(error);
      addLog(`Erro ao buscar imagens: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [supabase, addLog]);

  // Carrega imagens ao montar
  useEffect(() => {
    fetchStagingImages();
  }, [fetchStagingImages]);

  // Seleção em massa helpers
  const { confirm } = useConfirm();
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedIds(stagingImages.map((s) => s.id));
  const clearSelection = () => setSelectedIds([]);

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const ok = await confirm({
      title: `Excluir ${selectedIds.length} imagens?`,
      description: `Esta ação removerá os arquivos do storage e os registros de staging. Deseja continuar?`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
    });
    if (!ok) return;
    setUploading(true);
    addLog(`Excluindo ${selectedIds.length} imagens...`, 'info');
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário inválido');
      // Preparar lista de itens a serem processados
      const items = selectedIds
        .map((id) => stagingImages.find((i) => i.id === id))
        .filter(Boolean) as StagingImage[];

      setTotalToProcess(items.length);
      setProcessedCount(0);

      // 1) Chamar endpoint server-side que faz remoção segura e limpa staging
      try {
        const paths = items.map((i) => i.storage_path);
        const stagingIds = items.map((i) => i.id);
        const resp = await fetch('/api/storage/safe-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths, stagingIds }),
        });
        const json = await resp.json();
        if (!resp.ok) {
          addLog(
            `Falha ao remover do storage: ${json?.error || 'unknown'}`,
            'error'
          );
        } else {
          addLog(`Storage removido: ${items.length} itens`, 'info');
        }
      } catch (e: any) {
        addLog(`Erro storage: ${e?.message || String(e)}`, 'error');
      } finally {
        // marcar progresso como concluído
        setProcessedCount((_) => totalToProcess || items.length);
      }

      // 2) Deletar registros do DB em lote (chunks para evitar query muito grande)
      const idChunks: string[][] = [];
      const dbChunkSize = 500;
      for (let i = 0; i < selectedIds.length; i += dbChunkSize) {
        idChunks.push(selectedIds.slice(i, i + dbChunkSize));
      }

      for (const chunk of idChunks) {
        try {
          const { error } = await supabase
            .from('staging_images')
            .delete()
            .in('id', chunk);
          if (error) {
            addLog(
              `Falha ao remover registros (chunk): ${error.message}`,
              'error'
            );
          } else {
            addLog(`Registros removidos: ${chunk.length}`, 'success');
          }
        } catch (err: any) {
          addLog(`Erro ao remover chunk: ${err.message}`, 'error');
        }
      }

      // garantir que o progresso alcance o total
      setProcessedCount((_) => totalToProcess || items.length);

      // Atualiza UI
      await fetchStagingImages();
      clearSelection();
      toast.success('Imagens removidas com sucesso');
    } catch (e: any) {
      addLog(`Erro bulk delete: ${e.message}`, 'error');
      toast.error('Erro ao excluir imagens');
    } finally {
      setUploading(false);
      // reset progresso após breve atraso para UX
      setTimeout(() => {
        setProcessedCount(0);
        setTotalToProcess(0);
      }, 800);
    }
  };

  // 3. Upload de novas imagens
  const handleUpload = async (files: File[]) => {
    // ✅ VALIDAÇÃO 1: Limite do plano
    if (usage.current + stagingImages.length + files.length > usage.max) {
      toast.warning('Limite do plano excedido', {
        description: `Você está tentando enviar mais fotos do que seu plano permite.`,
        duration: 5000,
      });
      return; // ← Bloqueia upload
    }

    // ✅ VALIDAÇÃO 2: Tamanho máximo (5MB por arquivo)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = files.filter((f) => f.size > MAX_FILE_SIZE);

    if (oversizedFiles.length > 0) {
      const fileList = oversizedFiles
        .map((f) => `${f.name} (${Math.round(f.size / 1024 / 1024)}MB)`)
        .join(', ');

      toast.error('Arquivos muito grandes detectados', {
        description: `Limite: 5MB por foto. Arquivos rejeitados: ${fileList}`,
        duration: 8000,
      });
      addLog(
        `❌ Bloqueado: ${oversizedFiles.length} arquivo(s) excedem 5MB`,
        'error'
      );
      return;
    }

    // ✅ VALIDAÇÃO 3: Tipo de arquivo
    const invalidFiles = files.filter((f) => !f.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      toast.error('Apenas imagens são permitidas');
      addLog(`❌ ${invalidFiles.length} arquivo(s) não são imagens`, 'error');
      return;
    }

    setUploading(true);
    addLog(`Iniciando upload de ${files.length} arquivos...`);
    let successCount = 0;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão inválida');

      // compress large images client-side before upload (uses canvas -> webp)
      // NOTE: we'll now generate explicit 480/1200 variants and upload both,
      // so compressIfNeeded remains available but primary flow uses generateVariant.
      const compressIfNeeded = async (file: File) => {
        try {
          // Only process images
          if (!file.type.startsWith('image/')) return file;

          // ⚡ SEMPRE comprimir imagens > 1MB (reduzido de 2MB)
          if (file.size <= 1024 * 1024) return file; // <= 1MB

          // Try to use createImageBitmap for better memory handling on large files
          const imgBitmap = await (async () => {
            try {
              const blob = file;
              // createImageBitmap works well for large images in modern browsers
              // and prevents some decode issues that Image() has
              // @ts-ignore - lib DOM might not have exact typing in this env
              return await createImageBitmap(blob);
            } catch (err) {
              return null;
            }
          })();

          const canvas = document.createElement('canvas');
          let width = 0;
          let height = 0;

          if (imgBitmap) {
            width = imgBitmap.width;
            height = imgBitmap.height;
          } else {
            // fallback to Image decoding
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const r = new FileReader();
              r.onload = () => resolve(r.result as string);
              r.onerror = reject;
              r.readAsDataURL(file);
            });
            // decode via Image
            const img = await new Promise<HTMLImageElement | null>(
              (resolve) => {
                const el = new Image();
                el.onload = () => resolve(el);
                el.onerror = () => resolve(null);
                el.src = dataUrl;
              }
            );
            if (!img) return file;
            width = img.width;
            height = img.height;
          }

          // 📐 Limita dimensões para economizar storage e melhorar performance
          const maxDim = 1600; // ← Reduzido de 2000px para 1600px (suficiente para catálogo)
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return file;

          if (imgBitmap) ctx.drawImage(imgBitmap, 0, 0, width, height);
          else {
            // decode again via Image for drawing if bitmap wasn't available
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const r = new FileReader();
              r.onload = () => resolve(r.result as string);
              r.onerror = reject;
              r.readAsDataURL(file);
            });
            const img = await new Promise<HTMLImageElement | null>(
              (resolve) => {
                const el = new Image();
                el.onload = () => resolve(el);
                el.onerror = () => resolve(null);
                el.src = dataUrl;
              }
            );
            if (!img) return file;
            ctx.drawImage(img, 0, 0, width, height);
          }

          const compressedBlob: Blob | null = await new Promise(
            (resolve) => canvas.toBlob((b) => resolve(b), 'image/webp', 0.75) // ← Qualidade reduzida de 0.8 para 0.75
          );

          if (compressedBlob) {
            const originalKB = Math.round(file.size / 1024);
            const compressedKB = Math.round(compressedBlob.size / 1024);
            const savings = Math.round(
              ((file.size - compressedBlob.size) / file.size) * 100
            );

            addLog(
              `✨ Otimizado: ${originalKB}KB → ${compressedKB}KB (economizou ${savings}%)`,
              'success'
            );

            // Sempre retornar a versão otimizada quando possível para evitar
            // salvar a original grande no staging (reduz tráfego e storage).
            return new File([compressedBlob], `${Date.now()}.webp`, {
              type: compressedBlob.type || 'image/webp',
            });
          }

          // ⚠️ Fallback: se compressão falhou, ainda tenta reduzir qualidade JPEG/PNG
          addLog(`⚠️ WebP falhou, tentando fallback JPEG...`, 'info');

          const jpegBlob: Blob | null = await new Promise((resolve) =>
            canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.7)
          );

          if (jpegBlob && jpegBlob.size < file.size) {
            addLog(
              `✅ Fallback OK: ${Math.round(file.size / 1024)}KB → ${Math.round(jpegBlob.size / 1024)}KB`,
              'info'
            );
            return new File([jpegBlob], `${Date.now()}.jpg`, {
              type: 'image/jpeg',
            });
          }

          // Último recurso: retorna original (já validamos que é <= 5MB)
          addLog(
            `⚠️ Mantendo original: ${Math.round(file.size / 1024)}KB (compressão não ajudou)`,
            'info'
          );
          return file;
        } catch (err) {
          console.warn('compressIfNeeded failed', err);
          return file;
        }
      };

      // New flow: for each file, generate 480/1200, upload both and insert a single staging record
      await Promise.all(
        files.map(async (file) => {
          try {
            const baseName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

            // 1) Geração paralela das variantes no cliente
            const [blob480, blob1200] = await Promise.all([
              generateVariant(file, 480).catch(() => null),
              generateVariant(file, 1200).catch(() => null),
            ]);

            // Fallbacks: se geração falhou, reutiliza compressIfNeeded para produzir um File
            const final1200 = blob1200 ? blob1200 : (await compressIfNeeded(file));
            const final480 = blob480 ? blob480 : final1200;

            const path480 = `public/${user.id}/staging/${baseName}-480w.webp`;
            const path1200 = `public/${user.id}/staging/${baseName}-1200w.webp`;

            // 2) Upload simultâneo (fire both uploads)
            await Promise.all([
              supabase.storage
                .from('product-images')
                .upload(path480, final480 as Blob, { contentType: 'image/webp', upsert: true }),
              supabase.storage
                .from('product-images')
                .upload(path1200, final1200 as Blob, { contentType: 'image/webp', upsert: true }),
            ]);

            const url480 = supabase.storage.from('product-images').getPublicUrl(path480).data.publicUrl;
            const url1200 = supabase.storage.from('product-images').getPublicUrl(path1200).data.publicUrl;

            // 3) Persistir na tabela de staging com metadata já estruturado
            const { error: dbError } = await supabase.from('staging_images').insert({
              user_id: user.id,
              storage_path: path1200,
              original_name: file.name,
              url: url1200,
              metadata: {
                variants: [
                  { size: 480, url: url480, path: path480 },
                  { size: 1200, url: url1200, path: path1200 },
                ],
              },
            });

            if (!dbError) {
              successCount++;
              addLog(`✨ Otimizada e enviada: ${file.name}`, 'success');
            } else {
              addLog(`Erro ao salvar no banco: ${dbError.message}`, 'error');
            }
          } catch (err: any) {
            addLog(`❌ Erro em ${file.name}: ${err?.message || String(err)}`, 'error');
          }
        })
      );

      if (successCount > 0) {
        toast.success(`${successCount} fotos enviadas com sucesso!`);
        fetchStagingImages();
      }
    } catch (error: any) {
      toast.error('Erro durante o upload');
    } finally {
      setUploading(false);
    }
  };

  // 4. Salvar Produto
  const handleSaveProduct = async (
    id: string,
    data: { name: string; price: string; reference: string },
    productId?: string | null
  ) => {
    if (!canCreate) {
      toast.error('Limite Atingido', {
        description: `Seu plano não permite mais produtos (${usage.current}/${usage.max}).`,
        action: {
          label: 'Upgrade',
          onClick: () =>
            (window.location.href = '/dashboard/settings?tab=billing'),
        },
      });
      addLog(`Bloqueado: Limite do plano atingido.`, 'error');
      return;
    }

    try {
      const image = stagingImages.find((img) => img.id === id);
      if (!image) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      addLog(`Salvando produto: ${data.name}...`);
      const historyId = await ensureHistorySession();

      // Tentar localizar produto existente: se `productId` vier (seletor), usar por id; senão tentar por reference
      let existingProduct: any = null;
      if (productId) {
        const { data: ep } = await supabase
          .from('products')
          .select('id, image_variants, gallery_images, linked_images, image_url, image_path, user_id')
          .eq('user_id', user.id)
          .eq('id', productId)
          .maybeSingle();
        existingProduct = ep;
      } else {
        const { data: ep } = await supabase
          .from('products')
          .select('id, image_variants, gallery_images, linked_images, image_url, image_path, user_id')
          .eq('user_id', user.id)
          .eq('reference_code', data.reference)
          .maybeSingle();
        existingProduct = ep;
      }

      // gerar variantes 480/1200 a partir da url/storage_path
      const slugify = (s: string) =>
        s
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-');

      const slugBase = slugify(data.name || 'produto');

      // gerar variantes 480/1200 a partir da url/storage_path
      const ensure480 = (u: string) => {
        if (!u) return u;
        if (/-1200w(\.|$)/.test(u)) return u.replace(/-1200w(\.|$)/, '-480w$1');
        return u.replace(/(\.[a-z0-9]+)(\?|$)/i, '-480w$1');
      };

      const built = {
        url: image.publicUrl,
        path: image.storage_path || null,
        variants: [
          { url: ensure480(image.publicUrl || ''), path: image.storage_path ? ensure480(image.storage_path) : null, size: 480 },
          { url: image.publicUrl, path: image.storage_path || null, size: 1200 },
        ],
      };

      if (existingProduct && existingProduct.id) {
        // Fazer append inteligente em gallery_images do produto existente
        const currentGallery = Array.isArray(existingProduct.gallery_images)
          ? existingProduct.gallery_images
          : [];
        const currentLinked = Array.isArray(existingProduct.linked_images)
          ? existingProduct.linked_images
          : [];

        const exists = currentGallery.some((it: any) => (it.path && built.path && it.path === built.path) || it.url === built.url);
        const newGallery = exists ? currentGallery : [...currentGallery, { url: built.url, path: built.path, variants: built.variants }];

        const updates: any = {
          gallery_images: newGallery,
          linked_images: Array.from(new Set([...(currentLinked || []), built.url])),
          sync_status: 'synced',
          updated_at: new Date().toISOString(),
        };

        // Se o produto não tem capa, definir a nova imagem como capa
        const hasCover = Array.isArray(existingProduct.image_variants) && existingProduct.image_variants.length > 0;
        if (!hasCover) {
          updates.image_variants = built.variants;
          updates.image_url = built.url;
          updates.image_path = built.path;
        }

        const { error: updateErr } = await supabase.from('products').update(updates).eq('id', existingProduct.id);
        if (updateErr) throw updateErr;

        // Compatibilidade: inserir em product_images
        try {
          await supabase.from('product_images').upsert({ product_id: existingProduct.id, url: built.url, is_primary: false, position: 999, created_at: new Date().toISOString() }, { onConflict: 'product_id,url' });
        } catch (e) {
          // ignore
        }
      } else {
        // Inserir Produto novo com o formato correto
        const { error: productError } = await supabase.from('products').insert({
          user_id: user.id,
          name: data.name,
          reference_code: data.reference,
          price: parseFloat(data.price.replace(/\./g, '').replace(',', '.')),
          sale_price: parseFloat(data.price.replace(/\./g, '').replace(',', '.')), // Define igual inicialmente
          image_url: built.url,
          image_path: built.path,
          images: [built.url],
          linked_images: [built.url],
          // novo schema: capa (image_variants) e galeria (gallery_images)
          image_variants: built.variants,
          gallery_images: [{ url: built.url, path: built.path, variants: built.variants }],
          last_import_id: historyId,
          slug: `${slugBase}-${Date.now().toString(36).slice(-6)}`,
        });

        if (productError) throw productError;
      }

      // Atualizar Histórico
      if (historyId) {
        // Increment atomicamente usando RPC se possível, ou fetch+update
        // Simplificação: fetch atual + 1
        const { data: currentHist } = await supabase
          .from('import_history')
          .select('total_items')
          .eq('id', historyId)
          .maybeSingle();

        if (currentHist) {
          await supabase
            .from('import_history')
            .update({ total_items: currentHist.total_items + 1 })
            .eq('id', historyId);
        }
      }

      // Remover da Staging
      await supabase.from('staging_images').delete().eq('id', id);

      // Atualizar UI
      setStagingImages((prev) => prev.filter((img) => img.id !== id));
      refetchLimits(); // Atualiza contador do plano

      addLog(`Produto criado com sucesso: ${data.name}`, 'success');
      toast.success('Produto criado!');
    } catch (error: any) {
      console.error(error);
      addLog(`Erro ao salvar: ${error.message}`, 'error');
      toast.error('Erro ao salvar produto');
    }
  };

  // 5. Deletar Imagem
  const handleDeleteImage = async (id: string) => {
    try {
      const image = stagingImages.find((img) => img.id === id);
      if (!image) return;

      addLog(`Removendo imagem: ${image.original_name}...`);

      // Remover via endpoint server-side (remoção segura + cleanup)
      try {
        const resp = await fetch('/api/storage/safe-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paths: [image.storage_path],
            stagingIds: [id],
          }),
        });
        const json = await resp.json();
        if (!resp.ok) throw new Error(json?.error || 'delete_failed');
        setStagingImages((prev) => prev.filter((img) => img.id !== id));
        toast.info('Imagem descartada.');
      } catch (e: any) {
        addLog(`Erro ao deletar: ${e.message}`, 'error');
      }
    } catch (error: any) {
      console.error(error);
      addLog(`Erro ao deletar: ${error.message}`, 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 pb-24 space-y-8 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/products"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Importação Visual
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Transforme fotos em produtos rapidamente arrastando arquivos.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/products/import-history"
          className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 px-4 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
        >
          <History size={16} />
          Ver Histórico
        </Link>
      </div>

      {/* ÁREA DE UPLOAD */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
              1
            </div>
            Envie suas fotos
          </h3>
          <span className="text-xs text-gray-400">Suporta JPG, PNG, WEBP</span>
        </div>

        {uploading ? (
          <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-blue-100 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 rounded-xl animate-pulse">
            <Loader2 size={32} className="animate-spin mb-3" />
            <p className="font-medium">Otimizando e enviando...</p>
            <p className="text-xs opacity-70 mt-1">
              Comprimindo imagens para economizar espaço
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <ImageDropzone onDrop={handleUpload} />
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Info size={14} />
              <span>
                Máximo: <strong>5MB</strong> por foto | Formatos: JPG, PNG, WebP
                | Compressão automática
              </span>
            </div>
          </div>
        )}
      </div>

      {/* CONSOLE DE LOGS */}
      <LogConsole logs={logs} />

      {/* ÁREA DE PRODUTOS (Staging) */}
      {stagingImages.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                2
              </div>
              Preencha os dados{' '}
              <span className="text-gray-400 font-normal ml-1">
                ({stagingImages.length} pendentes)
              </span>
            </h3>

            <div className="flex items-center gap-2">
              <label className="inline-flex items-center text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={
                    selectedIds.length > 0 &&
                    selectedIds.length === stagingImages.length
                  }
                  onChange={(e) =>
                    e.target.checked ? selectAll() : clearSelection()
                  }
                />
                Selecionar tudo
              </label>
              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.length === 0 || uploading}
                className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${selectedIds.length === 0 ? 'bg-gray-100 text-gray-400' : 'bg-red-600 text-white hover:bg-red-700'}`}
              >
                Excluir selecionados ({selectedIds.length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {stagingImages.map((img) => (
              <div key={img.id} className="relative">
                <label className="absolute top-2 left-2 z-10 bg-white/80 dark:bg-black/60 rounded-full p-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(img.id)}
                    onChange={() => toggleSelect(img.id)}
                    className="w-4 h-4"
                  />
                </label>
                <StagingProductCard
                  key={img.id}
                  id={img.id}
                  imageUrl={img.publicUrl}
                  originalName={img.original_name}
                  onSave={handleSaveProduct}
                  onDelete={handleDeleteImage}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && stagingImages.length === 0 && !uploading && (
        <div className="text-center py-12 opacity-50">
          <UploadCloud size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">
            Nenhuma imagem pendente para processar.
          </p>
        </div>
      )}
    </div>
  );
}
