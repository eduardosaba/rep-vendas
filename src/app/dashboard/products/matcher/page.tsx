'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  ArrowLeft,
  Link as LinkIcon,
  Search,
  Image as ImageIcon,
  Check,
  Loader2,
  Filter,
  RefreshCcw,
  Layers,
  Terminal,
  MousePointerClick,
} from 'lucide-react';

// --- TIPAGEM ---
interface Product {
  id: string;
  name: string;
  reference_code: string;
  image_url: string | null;
  images: string[] | null;
}

interface StagingImage {
  id: string;
  storage_path: string;
  original_name: string;
  publicUrl: string;
  imported_from_csv?: boolean;
  alreadyLinked?: boolean;
}

export default function MatcherPage() {
  const supabase = createClient();

  // Estados de Dados
  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<StagingImage[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros e UI
  const [showImportedOnly, setShowImportedOnly] = useState(false);
  const [searchProduct, setSearchProduct] = useState('');
  const [linking, setLinking] = useState(false);

  // Seleção e Drag & Drop
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [dragOverProductId, setDragOverProductId] = useState<string | null>(
    null
  );

  // Console de Logs
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (
    message: string,
    type: 'info' | 'error' | 'success' = 'info'
  ) => {
    const icon = type === 'error' ? '❌ ' : type === 'success' ? '✅ ' : 'ℹ️ ';
    setLogs((prev) => [...prev, `${icon}${message}`]);
  };

  // --- 1. Carregar Dados ---
  const fetchData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // A. Buscar Produtos
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, reference_code, image_url, images')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Ordenar: Primeiro os sem imagem, depois os com imagem
      const pData = productsData || [];
      const productsWithoutImage = pData.filter((p) => !p.image_url);
      const productsWithImage = pData.filter((p) => p.image_url);
      setProducts([...productsWithoutImage, ...productsWithImage]);

      // B. Buscar Imagens da "Staging Area" (Piscina)
      const { data: imagesData } = await supabase
        .from('staging_images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Processar URLs das imagens
      const imagesWithUrls: StagingImage[] = (imagesData || []).map(
        (img: any) => {
          let publicUrl = '';
          if (img.url) {
            publicUrl = img.url;
          } else if (img.storage_path) {
            const { data } = supabase.storage
              .from('product-images')
              .getPublicUrl(img.storage_path);
            publicUrl = data?.publicUrl || '';
          }

          // Verificar se já está vinculada a algum produto (para mostrar label)
          const alreadyLinked = pData.some((p) => {
            const imgs = p.images || [];
            return imgs.includes(publicUrl) || p.image_url === publicUrl;
          });

          return {
            id: img.id,
            storage_path: img.storage_path,
            original_name: img.file_name || img.original_name || 'Sem nome',
            publicUrl,
            imported_from_csv: !!img.imported_from_csv,
            alreadyLinked,
          };
        }
      );

      setImages(imagesWithUrls);

      if (imagesWithUrls.length > 0) {
        addLog(
          `Carregados: ${imagesWithUrls.length} imagens e ${pData.length} produtos.`,
          'success'
        );
      } else {
        addLog(
          `Carregados: ${pData.length} produtos. Nenhuma imagem pendente.`,
          'info'
        );
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar dados');
      addLog('Erro crítico ao carregar dados.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Handlers de Seleção ---
  const toggleImageSelection = (id: string) => {
    setSelectedImageIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // --- 2. Ação de Vincular (Link) ---
  const handleLink = async (
    productId?: string | null,
    imageIdsInput?: string[]
  ) => {
    const pid = productId || selectedProductId;
    const iids = imageIdsInput || selectedImageIds;

    if (!pid) {
      toast.warning('Selecione um produto primeiro.');
      return;
    }
    if (iids.length === 0) {
      toast.warning('Selecione pelo menos uma imagem.');
      return;
    }

    setLinking(true);
    addLog(`Vinculando ${iids.length} foto(s) ao produto...`);

    try {
      const productObj = products.find((p) => p.id === pid);
      const imagesObj = images.filter((img) => iids.includes(img.id));

      if (!productObj || imagesObj.length === 0)
        throw new Error('Dados inválidos para vinculação.');

      // Mesclar imagens existentes com as novas
      const currentImages = productObj.images || [];
      const newUrls = imagesObj.map((img) => img.publicUrl);

      // Remove duplicatas e garante array único
      const combinedImages = Array.from(
        new Set([...currentImages, ...newUrls])
      );

      // Define a primeira como capa se não houver capa
      const newCoverUrl = productObj.image_url || combinedImages[0];

      // 1. Atualizar Produto no Banco
      const { error: updateError } = await supabase
        .from('products')
        .update({
          image_url: newCoverUrl,
          images: combinedImages,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pid);

      if (updateError) throw updateError;

      // 2. Remover da tabela 'staging_images' (pois agora pertencem ao produto)
      const { error: deleteError } = await supabase
        .from('staging_images')
        .delete()
        .in('id', iids);

      if (deleteError) throw deleteError;

      // 3. Atualizar Estado Local (UI Otimista)
      setImages((prev) => prev.filter((i) => !iids.includes(i.id)));

      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === pid) {
            return { ...p, image_url: newCoverUrl, images: combinedImages };
          }
          return p;
        })
      );

      // Resetar seleções
      setSelectedProductId(null);
      setSelectedImageIds([]);
      setDragOverProductId(null);

      toast.success('Imagens vinculadas com sucesso!');
      addLog(`Sucesso: Imagens vinculadas a "${productObj.name}"`, 'success');
    } catch (error: any) {
      console.error('Erro ao vincular:', error);
      toast.error('Erro ao salvar vínculo.');
      addLog(`Erro ao vincular: ${error.message}`, 'error');
    } finally {
      setLinking(false);
    }
  };

  // Filtro Otimizado
  const filteredProducts = useMemo(() => {
    const term = searchProduct.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.reference_code.toLowerCase().includes(term)
    );
  }, [products, searchProduct]);

  const filteredImages = useMemo(() => {
    return images.filter((img) => !showImportedOnly || img.imported_from_csv);
  }, [images, showImportedOnly]);

  return (
    <div className="flex flex-col h-[calc(100vh-1rem)] bg-gray-50 dark:bg-slate-950 p-4 md:p-6 overflow-hidden">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/products"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Matcher de Produtos
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Arraste fotos da direita para os produtos da esquerda.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
            title="Recarregar dados"
          >
            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setShowImportedOnly((s) => !s)}
            className={`px-4 py-2.5 text-sm font-medium border rounded-lg transition-colors shadow-sm flex items-center gap-2 ${
              showImportedOnly
                ? 'bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)] dark:bg-[var(--primary)]/20 dark:border-[var(--primary)]/40 dark:text-[var(--primary)]'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-slate-900 dark:border-slate-800 dark:text-gray-300'
            }`}
          >
            <Filter size={16} />
            {showImportedOnly ? 'Apenas Importadas' : 'Todas as Fotos'}
          </button>

          <button
            onClick={() => handleLink()}
            disabled={
              !selectedProductId || selectedImageIds.length === 0 || linking
            }
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-white transition-all shadow-md active:scale-95 text-sm
              ${!selectedProductId || selectedImageIds.length === 0 ? 'bg-gray-300 dark:bg-slate-700 cursor-not-allowed opacity-70' : 'bg-[var(--primary)] hover:opacity-90'}
            `}
          >
            {linking ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <LinkIcon size={18} />
            )}
            {selectedImageIds.length > 0
              ? `Vincular (${selectedImageIds.length})`
              : 'Vincular'}
          </button>
        </div>
      </div>

      {/* CONSOLE DE LOGS */}
      {logs.length > 0 && (
        <div className="mb-4 bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono shadow-inner border border-gray-800 max-h-32 overflow-y-auto shrink-0">
          <div className="mb-2 text-gray-500 border-b border-gray-800 pb-1 font-bold flex items-center gap-2 sticky top-0 bg-gray-900">
            <Terminal size={14} /> LOG DE ATIVIDADE
          </div>
          {logs.map((log, index) => (
            <div
              key={index}
              className="truncate py-0.5 border-b border-gray-800/50 last:border-0"
            >
              <span className="opacity-40 mr-2">
                [{new Date().toLocaleTimeString()}]
              </span>
              {log}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      )}

      {/* ÁREA PRINCIPAL (2 COLUNAS) */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        {/* COLUNA ESQUERDA: PRODUTOS */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden h-1/2 lg:h-auto">
          <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-10">
            <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2 text-sm uppercase tracking-wider">
              <Layers size={16} /> Produtos ({filteredProducts.length})
            </h3>
            <div className="relative w-full sm:w-64">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Buscar por nome ou ref..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="overflow-y-auto p-3 space-y-2 flex-1 bg-gray-50/50 dark:bg-slate-950/50">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                <Loader2 className="animate-spin" size={32} />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                <Search size={32} className="mb-2 opacity-50" />
                <p>Nenhum produto encontrado.</p>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => setSelectedProductId(product.id)}
                  // Eventos de Drop
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverProductId(product.id);
                  }}
                  onDragLeave={() => setDragOverProductId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverProductId(null);
                    const data = e.dataTransfer.getData(
                      'application/x-product-images'
                    );
                    if (data) {
                      try {
                        const ids = JSON.parse(data);
                        if (Array.isArray(ids) && ids.length > 0)
                          handleLink(product.id, ids);
                      } catch (err) {
                        console.error(err);
                      }
                    }
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex justify-between items-center group
                    ${
                      selectedProductId === product.id
                        ? 'border-[var(--primary)] bg-[var(--primary)]/10 dark:bg-[var(--primary)]/20 ring-1 ring-[var(--primary)]'
                        : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-slate-600'
                    }
                    ${
                      dragOverProductId === product.id
                        ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20 scale-[1.01]'
                        : ''
                    }
                  `}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {/* Mini Galeria */}
                    <div className="flex -space-x-2 overflow-hidden flex-shrink-0 pl-1">
                      {product.images && product.images.length > 0 ? (
                        product.images
                          .slice(0, 3)
                          .map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt=""
                              className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 object-cover bg-gray-200"
                            />
                          ))
                      ) : (
                        <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-300">
                          <ImageIcon size={16} />
                        </div>
                      )}
                      {product.images && product.images.length > 3 && (
                        <div className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-400">
                          +{product.images.length - 3}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4
                        className={`font-medium text-sm truncate ${selectedProductId === product.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-gray-200'}`}
                      >
                        {product.name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                        {product.reference_code}
                      </p>
                    </div>
                  </div>

                  {selectedProductId === product.id && (
                    <div className="h-6 w-6 bg-[var(--primary)] rounded-full flex items-center justify-center text-white shadow-sm flex-shrink-0 animate-in zoom-in">
                      <Check size={14} />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: IMAGENS (STAGING) */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden h-1/2 lg:h-auto">
          <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 sticky top-0 z-10 flex justify-between items-center">
            <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2 text-sm uppercase tracking-wider">
              <ImageIcon size={16} /> Fotos Disponíveis ({filteredImages.length}
              )
            </h3>
            {selectedImageIds.length > 0 && (
              <span className="text-xs font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full animate-in fade-in">
                {selectedImageIds.length} selecionada(s)
              </span>
            )}
          </div>

          <div className="overflow-y-auto p-4 flex-1 bg-gray-50/30 dark:bg-slate-950/50">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                <Loader2 className="animate-spin" size={32} />
              </div>
            ) : filteredImages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center p-8">
                <ImageIcon size={48} className="mb-4 opacity-20" />
                <p className="mb-4">Nenhuma foto disponível para vinculação.</p>
                <Link
                  href="/dashboard/products/import-visual"
                  className="px-4 py-2 bg-[var(--primary)] text-white text-sm rounded-lg hover:opacity-90 transition-all font-medium"
                >
                  Carregar novas fotos
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredImages.map((img) => (
                  <div
                    key={img.id}
                    draggable={true}
                    // Eventos de Drag
                    onDragStart={(e) => {
                      let idsToDrag = selectedImageIds;
                      // Se arrastar uma não selecionada, seleciona ela automaticamente
                      if (!idsToDrag.includes(img.id)) {
                        idsToDrag = [img.id];
                        setSelectedImageIds([img.id]);
                      }
                      e.dataTransfer.setData(
                        'application/x-product-images',
                        JSON.stringify(idsToDrag)
                      );
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() => toggleImageSelection(img.id)}
                    className={`aspect-square rounded-xl border-2 cursor-grab active:cursor-grabbing overflow-hidden relative group shadow-sm bg-white dark:bg-slate-800 transition-all 
                      ${
                        selectedImageIds.includes(img.id)
                          ? 'border-indigo-500 ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900 shadow-md scale-[0.96]'
                          : 'border-transparent hover:border-indigo-300 dark:hover:border-slate-600'
                      }
                    `}
                  >
                    { }
                    <img
                      src={img.publicUrl}
                      alt="Staging"
                      className="w-full h-full object-contain p-2 transition-transform group-hover:scale-105"
                    />

                    {/* Labels */}
                    {img.imported_from_csv && (
                      <div className="absolute top-2 left-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/80 dark:text-yellow-200 px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm">
                        CSV
                      </div>
                    )}
                    {img.alreadyLinked && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm flex items-center gap-1">
                        <Check size={8} /> Em uso
                      </div>
                    )}

                    {/* Nome do arquivo (Hover) */}
                    <div className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-[10px] p-1 truncate text-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {img.original_name}
                    </div>

                    {/* Checkbox Visual */}
                    {selectedImageIds.includes(img.id) && (
                      <div className="absolute top-2 right-2 h-6 w-6 bg-[var(--primary)] rounded-full flex items-center justify-center text-white shadow-md animate-in zoom-in border border-white dark:border-slate-800">
                        {selectedImageIds.length > 1 ? (
                          <Layers size={12} />
                        ) : (
                          <Check size={14} />
                        )}
                      </div>
                    )}

                    {/* Dica de arraste (Hover) */}
                    {!selectedImageIds.includes(img.id) && (
                      <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                        <MousePointerClick
                          className="text-white drop-shadow-md"
                          size={24}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
