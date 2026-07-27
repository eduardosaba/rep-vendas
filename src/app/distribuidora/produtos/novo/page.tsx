'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createContextProduct } from '@/actions/commercial/products-crud'
import Link from 'next/link'

export default function NovoProdutoPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Basic Information
  const [name, setName] = useState('')
  const [referenceCode, setReferenceCode] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('Armação')
  
  // Optical Specifications
  const [gender, setGender] = useState('Unissex')
  const [material, setMaterial] = useState('')
  const [materialHaste, setMaterialHaste] = useState('')
  const [frameFormato, setFrameFormato] = useState('')
  const [colorNome, setColorNome] = useState('')
  const [colecao, setColecao] = useState('')
  const [fotocromatico, setFotocromatico] = useState(false)
  const [polarizado, setPolarizado] = useState(false)
  
  // Commercial & Inventory
  const [price, setPrice] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [cost, setCost] = useState('')
  const [sku, setSku] = useState('')
  const [stock, setStock] = useState('0')

  const parseMoney = (val: string) => parseFloat(val.replace(',', '.')) || 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await createContextProduct({
        name,
        referenceCode,
        brand,
        category,
        gender,
        material,
        material_haste: materialHaste,
        frame_formato: frameFormato,
        color_nome: colorNome,
        colecao,
        fotocromatico,
        polarizado,
        sku,
        price: parseMoney(price),
        sale_price: parseMoney(salePrice),
        cost: parseMoney(cost),
        stockQuantity: parseInt(stock) || 0
      })

      if (result.success) {
        router.push('/distribuidora/produtos')
        router.refresh()
      } else {
        setError(result.error || null)
      }
    })
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <header>
        <Link href="/distribuidora/produtos" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
          ← Voltar para a listagem
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 mt-2">Cadastrar Produto</h1>
        <p className="text-sm text-slate-500">Adicione uma nova referência ao catálogo mestre.</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-slate-200/60 shadow-sm space-y-8">
        {error && <div className="p-3 bg-rose-50 text-rose-800 text-sm rounded-lg border border-rose-100">{error}</div>}

        {/* Section 1: Informações Básicas */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Informações Básicas</h2>
          
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-700">Nome do Modelo / Armação *</label>
            <input 
              type="text" 
              required
              placeholder="Ex: Tommy Hilfiger TH 1542 Oval"
              className="border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-slate-400 transition-colors"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700">Código / Referência *</label>
              <input 
                type="text" 
                required
                placeholder="Ex: TH-1542-C1"
                className="border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-slate-400 transition-colors font-mono"
                value={referenceCode}
                onChange={e => setReferenceCode(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700">Marca *</label>
              <input 
                type="text" 
                required
                placeholder="Ex: Tommy Hilfiger"
                className="border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-slate-400 transition-colors"
                value={brand}
                onChange={e => setBrand(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700">Categoria</label>
              <input 
                type="text" 
                placeholder="Ex: Armação de Grau"
                className="border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-slate-400 transition-colors"
                value={category}
                onChange={e => setCategory(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Section 2: Ficha Técnica (Óptica) */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Ficha Técnica</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700">Gênero</label>
              <select 
                value={gender} 
                onChange={e => setGender(e.target.value)}
                className="border border-slate-200 rounded-lg p-2.5 text-sm outline-none bg-transparent"
              >
                <option value="Unissex">Unissex</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Infantil">Infantil</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700">Formato</label>
              <input 
                type="text" 
                placeholder="Ex: Oval, Retangular"
                className="border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-slate-400 transition-colors"
                value={frameFormato}
                onChange={e => setFrameFormato(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700">Material Frontal</label>
              <input 
                type="text" 
                placeholder="Ex: Acetato"
                className="border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-slate-400 transition-colors"
                value={material}
                onChange={e => setMaterial(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700">Material da Haste</label>
              <input 
                type="text" 
                placeholder="Ex: Metal"
                className="border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-slate-400 transition-colors"
                value={materialHaste}
                onChange={e => setMaterialHaste(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700">Cor Nominal</label>
              <input 
                type="text" 
                placeholder="Ex: Tartaruga Fosco"
                className="border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-slate-400 transition-colors"
                value={colorNome}
                onChange={e => setColorNome(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700">Coleção / Ano</label>
              <input 
                type="text" 
                placeholder="Ex: Verão 2026"
                className="border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-slate-400 transition-colors"
                value={colecao}
                onChange={e => setColecao(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700">SKU (Interno)</label>
              <input 
                type="text" 
                placeholder="Ex: 812999"
                className="border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-slate-400 transition-colors"
                value={sku}
                onChange={e => setSku(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-4 mt-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                <input type="checkbox" checked={fotocromatico} onChange={e => setFotocromatico(e.target.checked)} className="rounded text-slate-900 focus:ring-slate-900" />
                Fotocromático
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                <input type="checkbox" checked={polarizado} onChange={e => setPolarizado(e.target.checked)} className="rounded text-slate-900 focus:ring-slate-900" />
                Polarizado
              </label>
            </div>
          </div>
        </section>

        {/* Section 3: Comercial & Estoque */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Comercial & Estoque</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700">Preço Base (R$) *</label>
              <input 
                type="text" 
                required
                placeholder="0,00"
                className="border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-slate-400 transition-colors font-semibold"
                value={price}
                onChange={e => setPrice(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700">Preço Promocional</label>
              <input 
                type="text" 
                placeholder="0,00"
                className="border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-slate-400 transition-colors font-semibold text-rose-600"
                value={salePrice}
                onChange={e => setSalePrice(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700">Custo</label>
              <input 
                type="text" 
                placeholder="0,00"
                className="border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-slate-400 transition-colors"
                value={cost}
                onChange={e => setCost(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700">Estoque Físico *</label>
              <input 
                type="number" 
                required
                placeholder="0"
                className="border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-slate-400 transition-colors"
                value={stock}
                onChange={e => setStock(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Botões de Ação */}
        <div className="flex justify-end pt-4 border-t border-slate-100 gap-3">
          <Link 
            href="/distribuidora/produtos" 
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center"
          >
            Cancelar
          </Link>
          <button 
            type="submit" 
            disabled={isPending}
            className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium py-2 px-5 rounded-lg text-sm transition-all shadow-sm"
          >
            {isPending ? 'Gravando...' : 'Confirmar Cadastro'}
          </button>
        </div>
      </form>
    </div>
  )
}
