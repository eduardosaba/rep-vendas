'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateContextProduct } from '@/actions/commercial/products-update'
import { CatalogScope } from '@/lib/catalog-scope'
import { formatImageUrl } from '@/lib/imageUtils'
import { Package, Image as ImageIcon, Box, Activity, Share2, AlertCircle } from 'lucide-react'

type TabType = 'dados' | 'imagens' | 'estoque' | 'sincronizacao' | 'historico'

export default function ProductWorkspace({ product, scope }: { product: any, scope: CatalogScope }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('dados')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Estados dos Dados Comerciais / Ópticos
  const [name, setName] = useState(product.name || '')
  const [referenceCode, setReferenceCode] = useState(product.reference_code || '')
  const [sku, setSku] = useState(product.sku || '')
  const [brand, setBrand] = useState(product.brand || '')
  const [category, setCategory] = useState(product.category || 'Armação')
  const [gender, setGender] = useState(product.gender || 'Unissex')
  const [material, setMaterial] = useState(product.material || '')
  const [materialHaste, setMaterialHaste] = useState(product.material_haste || '')
  const [frameFormato, setFrameFormato] = useState(product.frame_formato || '')
  const [colorNome, setColorNome] = useState(product.color_nome || '')
  const [colecao, setColecao] = useState(product.colecao || '')
  const [fotocromatico, setFotocromatico] = useState(!!product.fotocromatico)
  const [polarizado, setPolarizado] = useState(!!product.polarizado)
  
  // Financeiro
  const [price, setPrice] = useState((product.price || 0).toString())
  const [salePrice, setSalePrice] = useState((product.sale_price || 0).toString())
  const [cost, setCost] = useState((product.cost || 0).toString())
  
  // Estoque
  const [stock, setStock] = useState((product.stock_quantity || 0).toString())
  const [minStock, setMinStock] = useState((product.min_stock_level || 5).toString())
  const [manageStock, setManageStock] = useState(!!product.manage_stock)
  const [isActive, setIsActive] = useState(product.is_active !== false)

  const parseMoney = (val: string) => parseFloat(val.replace(',', '.')) || 0

  const handleUpdateBase = () => {
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await updateContextProduct({
        id: product.id,
        name,
        referenceCode,
        brand,
        category,
        gender,
        material,
        colecao,
        colorNome,
        price: parseMoney(price),
        stockQuantity: parseInt(stock) || 0,
        isActive
      })
      if (result.success) {
        setSuccess(true)
        router.refresh()
      } else {
        setError(result.error || null)
      }
    })
  }

  // Helpers para visualização de imagem
  const mainImageSrc = formatImageUrl(product.image_path || (product.gallery_images?.[0]?.path) || product.image_url)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link href="/distribuidora/produtos" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
            ← Voltar para o catálogo
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-bold text-slate-800">{product.name}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
              {isActive ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <p className="text-sm text-slate-500 font-mono text-xs text-slate-400 mt-1">Ref: {product.reference_code || 'N/A'}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleUpdateBase} disabled={isPending} className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium py-2 px-5 rounded-lg text-sm shadow-sm transition-all">
            {isPending ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </header>

      {success && <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm">✓ As alterações foram gravadas no catálogo.</div>}
      {error && <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-sm">{error}</div>}

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* SIDEBAR DE NAVEGAÇÃO DO WORKSPACE */}
        <aside className="w-full lg:w-64 shrink-0 space-y-2">
          {/* Card Resumo */}
          <div className="bg-white border border-slate-200/60 shadow-sm rounded-xl p-4 flex flex-col items-center mb-4">
            <div className="w-24 h-24 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center p-2 mb-3 overflow-hidden">
               <img src={mainImageSrc} alt={product.name} className="object-contain w-full h-full" />
            </div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider text-center">{product.brand || 'Sem Marca'}</p>
            <p className="text-sm font-semibold text-slate-700 text-center">{parseMoney(price).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
          </div>

          <nav className="flex flex-col space-y-1">
            <button onClick={() => setActiveTab('dados')} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dados' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Package className="w-4 h-4" /> Dados Comerciais
            </button>
            <button onClick={() => setActiveTab('imagens')} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'imagens' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <ImageIcon className="w-4 h-4" /> Galeria & Mídia
            </button>
            <button onClick={() => setActiveTab('estoque')} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'estoque' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Box className="w-4 h-4" /> Estoque & Logística
            </button>
            <button onClick={() => setActiveTab('sincronizacao')} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'sincronizacao' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Share2 className="w-4 h-4" /> Sincronização
            </button>
            <button onClick={() => setActiveTab('historico')} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'historico' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Activity className="w-4 h-4" /> Histórico
            </button>
          </nav>
        </aside>

        {/* ÁREA PRINCIPAL DO WORKSPACE */}
        <main className="flex-1 bg-white border border-slate-200/60 shadow-sm rounded-xl p-6 min-h-[500px]">
          
          {/* TAB: DADOS COMERCIAIS */}
          {activeTab === 'dados' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <section className="space-y-4">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Identificação</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700">Nome do Modelo</label>
                    <input type="text" className="border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-slate-400" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700">Referência / Código</label>
                    <input type="text" className="border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-slate-400 font-mono" value={referenceCode} onChange={e => setReferenceCode(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700">Marca / Grife</label>
                    <input type="text" className="border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-slate-400" value={brand} onChange={e => setBrand(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700">Coleção / Ano</label>
                    <input type="text" className="border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-slate-400" value={colecao} onChange={e => setColecao(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700">SKU / EAN (Interno)</label>
                    <input type="text" className="border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-slate-400 font-mono" value={sku} onChange={e => setSku(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700">Visibilidade</label>
                    <div className="flex items-center h-[38px] px-3 border border-slate-200 rounded-lg bg-slate-50">
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded text-slate-900" /> Ativo para Vendas
                      </label>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Características Ópticas</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700">Gênero</label>
                    <select value={gender} onChange={e => setGender(e.target.value)} className="border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white">
                      <option value="Unissex">Unissex</option><option value="Masculino">Masculino</option><option value="Feminino">Feminino</option><option value="Infantil">Infantil</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700">Formato da Armação</label>
                    <select value={frameFormato} onChange={e => setFrameFormato(e.target.value)} className="border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white">
                      <option value="">Selecione...</option><option value="Aviador">Aviador</option><option value="Quadrado">Quadrado</option><option value="Redondo">Redondo</option><option value="Retangular">Retangular</option><option value="Gatinho">Gatinho</option><option value="Esportivo">Esportivo</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700">Cor Nominal</label>
                    <input type="text" className="border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-slate-400" value={colorNome} onChange={e => setColorNome(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700">Material Frontal</label>
                    <select value={material} onChange={e => setMaterial(e.target.value)} className="border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white">
                       <option value="">Selecione...</option><option value="Acetato">Acetato</option><option value="Metal">Metal</option><option value="TR90">TR90</option><option value="Injetado">Injetado</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700">Material da Haste</label>
                    <select value={materialHaste} onChange={e => setMaterialHaste(e.target.value)} className="border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white">
                       <option value="">Selecione...</option><option value="Acetato">Acetato</option><option value="Metal">Metal</option><option value="Silicone">Silicone</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-6 mt-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                    <input type="checkbox" checked={fotocromatico} onChange={e => setFotocromatico(e.target.checked)} className="rounded text-slate-900" />
                    Lente Fotocromática
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                    <input type="checkbox" checked={polarizado} onChange={e => setPolarizado(e.target.checked)} className="rounded text-slate-900" />
                    Lente Polarizada
                  </label>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Precificação Financeira</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700">Preço Base (R$)</label>
                    <input type="text" className="border border-slate-200 rounded-lg p-2 text-sm outline-none font-semibold text-slate-800" value={price} onChange={e => setPrice(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700">Preço Promocional (R$)</label>
                    <input type="text" className="border border-slate-200 rounded-lg p-2 text-sm outline-none font-semibold text-rose-600" value={salePrice} onChange={e => setSalePrice(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700">Custo (R$)</label>
                    <input type="text" className="border border-slate-200 rounded-lg p-2 text-sm outline-none" value={cost} onChange={e => setCost(e.target.value)} />
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB: IMAGENS */}
          {activeTab === 'imagens' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Galeria de Imagens</h2>
              
              {product.image_is_shared ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex flex-col items-center text-center space-y-3">
                  <Share2 className="w-8 h-8 text-blue-500" />
                  <h3 className="font-semibold text-blue-900">Imagem Compartilhada da Matriz</h3>
                  <p className="text-sm text-blue-700 max-w-md">
                    Este catálogo é uma réplica sincronizada. As fotos oficias do fornecedor estão sendo exibidas. Qualquer atualização na matriz refletirá automaticamente no seu portfólio.
                  </p>
                  <p className="text-xs text-blue-500 bg-white/50 px-3 py-1 rounded-full border border-blue-100">Atualizado dinamicamente via CDN</p>
                  
                  <div className="mt-4 flex gap-4 overflow-x-auto p-4 w-full justify-center">
                     <img src={mainImageSrc} alt="Matriz" className="w-32 h-32 object-contain bg-white rounded-lg border border-blue-100 p-2 shadow-sm" />
                  </div>
                </div>
              ) : scope.type === 'BUSINESS' ? (
                <div className="space-y-6">
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {/* Espaços para galeria corporativa */}
                     {['Frente', 'Lateral', 'Detalhe Haste', 'Modelo Usando'].map((pos, idx) => (
                       <div key={idx} className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-4 hover:bg-slate-100 transition-colors cursor-pointer group">
                          {idx === 0 && mainImageSrc !== '/placeholder.png' ? (
                             <img src={mainImageSrc} alt={pos} className="object-contain w-full h-full" />
                          ) : (
                            <>
                              <ImageIcon className="w-8 h-8 text-slate-300 mb-2 group-hover:text-slate-400" />
                              <span className="text-xs font-semibold text-slate-400">{pos}</span>
                              <span className="text-[10px] text-slate-400 mt-1">Clique p/ Upload</span>
                            </>
                          )}
                       </div>
                     ))}
                   </div>
                   <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center gap-2">
                     <AlertCircle className="w-4 h-4" /> 
                     O upload salvará a imagem no Supabase Storage otimizando para formato WebP através de Trigger e entregando via Edge CDN.
                   </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Cenário Representante Independente - Minhas Imagens */}
                  <div className="w-48 aspect-square bg-slate-50 border-2 border-slate-200 rounded-xl flex flex-col items-center justify-center p-4 mx-auto">
                    {mainImageSrc !== '/placeholder.png' ? (
                      <img src={mainImageSrc} alt="Minha Imagem" className="object-contain w-full h-full" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-300 mb-2" />
                    )}
                  </div>
                  <div className="text-center">
                    <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg text-sm border border-slate-200 transition-colors">
                      Substituir Foto Pessoal
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: ESTOQUE */}
          {activeTab === 'estoque' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Controle Logístico</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                  <div className="flex flex-col gap-1 mb-4">
                    <label className="text-xs font-bold text-slate-700">Saldo Físico Atual (Un)</label>
                    <input type="number" className="border border-slate-200 rounded-lg p-2.5 text-lg outline-none font-bold bg-white w-32" value={stock} onChange={e => setStock(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1 mb-4">
                    <label className="text-xs font-bold text-slate-700">Ponto de Reposição (Mínimo)</label>
                    <input type="number" className="border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white w-32" value={minStock} onChange={e => setMinStock(e.target.value)} />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={manageStock} onChange={e => setManageStock(e.target.checked)} className="rounded text-slate-900" /> Controlar Estoque Rígido (Bloquear sem saldo)
                  </label>
                </div>
                
                <div className="border border-amber-200 bg-amber-50 rounded-xl p-5 text-amber-800">
                  <h3 className="font-bold text-sm mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Alerta de Inventário</h3>
                  <p className="text-xs leading-relaxed">O lançamento no painel altera o saldo local instantaneamente. O controle distribuído de ruptura atua nos carrinhos dos representantes autônomos logados à este SKU.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SINCRONIZAÇÃO */}
          {activeTab === 'sincronizacao' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Vínculo Corporativo</h2>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                  <span className="text-sm text-slate-600">Origem de Propriedade</span>
                  <span className="font-medium text-sm text-slate-800">
                    {product.original_product_id ? 'Herdado da Matriz' : (scope.type === 'BUSINESS' ? 'Catálogo Master (Distribuidora)' : 'Produto Autônomo')}
                  </span>
                </div>
                
                {product.original_product_id && (
                  <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                    <span className="text-sm text-slate-600">ID da Matriz Original</span>
                    <span className="font-mono text-xs font-medium text-blue-600">{product.original_product_id}</span>
                  </div>
                )}

                <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                  <span className="text-sm text-slate-600">Status no Matcher Engine</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${product.sync_status === 'synced' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                    {product.sync_status === 'synced' ? '🟢 Sincronizado' : 'Não Vinculado'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Último Refresh (Edge)</span>
                  <span className="text-sm font-medium text-slate-800">
                    {new Date(product.updated_at).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit'})}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB: HISTÓRICO */}
          {activeTab === 'historico' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Auditoria e Movimentação</h2>
              <div className="relative border-l border-slate-200 ml-3 pl-5 space-y-6 mt-4">
                <div className="relative">
                  <span className="absolute -left-[27px] bg-white border border-slate-300 w-3 h-3 rounded-full mt-1"></span>
                  <p className="text-xs font-bold text-slate-500">{new Date(product.updated_at).toLocaleDateString('pt-BR')}</p>
                  <p className="text-sm text-slate-700 mt-0.5">Última atualização de ficha técnica.</p>
                </div>
                {product.last_import_id && (
                  <div className="relative">
                    <span className="absolute -left-[27px] bg-white border border-slate-300 w-3 h-3 rounded-full mt-1"></span>
                    <p className="text-xs font-bold text-slate-500">{new Date(product.created_at).toLocaleDateString('pt-BR')}</p>
                    <p className="text-sm text-slate-700 mt-0.5">Produto integrado via carga em massa (ID: {product.last_import_id.split('-')[0]}).</p>
                  </div>
                )}
                <div className="relative">
                  <span className="absolute -left-[27px] bg-white border border-slate-300 w-3 h-3 rounded-full mt-1"></span>
                  <p className="text-xs font-bold text-slate-500">{new Date(product.created_at).toLocaleDateString('pt-BR')}</p>
                  <p className="text-sm text-slate-700 mt-0.5">Registro inicial no catálogo virtual.</p>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
