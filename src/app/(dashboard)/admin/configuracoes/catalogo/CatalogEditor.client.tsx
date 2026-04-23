"use client"

import React, { useState } from 'react'
import { Layout, Type, Image as ImageIcon, Smartphone, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function CatalogEditorClient() {
  const [activeTab, setActiveTab] = useState<'conteudo' | 'galeria' | 'visual'>('conteudo')

  const [formData, setFormData] = useState({
    headline: '',
    about_text: '',
    gallery_urls: [] as string[],
    cover_image: ''
  })

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setLoading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
      const filePath = `gallery/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('companies')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('companies').getPublicUrl(filePath)
      const publicUrl = data?.publicUrl || ''

      setFormData((prev) => ({
        ...prev,
        gallery_urls: [...prev.gallery_urls, publicUrl].slice(0, 6),
      }))

      toast?.success && toast.success('Imagem adicionada à galeria!')
    } catch (err: any) {
      console.error('handleUpload error', err)
      toast?.error && toast.error('Erro ao fazer upload da imagem')
    } finally {
      setLoading(false)
    }
  }

  async function uploadFile(file: File) {
    try {
      setLoading(true)
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/catalogo/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        const txt = await res.text().catch(() => res.statusText)
        console.error('Upload failed:', txt)
        return null
      }
      const json = await res.json().catch(() => null)
      return json?.url ?? null
    } catch (err) {
      console.error(err)
      return null
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    try {
      setSaving(true)
      const res = await fetch('/api/admin/catalogo/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: formData.headline,
          about_text: formData.about_text,
          gallery_urls: formData.gallery_urls,
          cover_image: formData.cover_image,
        }),
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => res.statusText)
        toast?.error && toast.error('Erro ao salvar: ' + txt)
        return false
      }
      const json = await res.json().catch(() => null)
      if (json?.success) {
        toast?.success && toast.success('Configurações salvas com sucesso')
        return true
      }
      toast?.error && toast.error(json?.error || 'Erro ao salvar')
      return false
    } catch (err: any) {
      console.error('save error', err)
      toast?.error && toast.error('Erro ao salvar as alterações')
      return false
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

      {/* 1. NAVEGAÇÃO LATERAL DE EDIÇÃO (3 colunas) */}
      <aside className="lg:col-span-3 space-y-4">
        <nav className="flex flex-col gap-2">
          <TabButton
            active={activeTab === 'conteudo'}
            onClick={() => setActiveTab('conteudo')}
            icon={<Type size={18} />}
            label="Textos e História"
          />
          <TabButton
            active={activeTab === 'galeria'}
            onClick={() => setActiveTab('galeria')}
            icon={<ImageIcon size={18} />}
            label="Galeria Lifestyle"
          />
          <TabButton
            active={activeTab === 'visual'}
            onClick={() => setActiveTab('visual')}
            icon={<Layout size={18} />}
            label="Capa e Banners"
          />
        </nav>

        <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100 mt-10">
          <p className="text-[10px] font-black text-amber-600 uppercase mb-2">Dica de Especialista</p>
          <p className="text-xs text-amber-800 leading-relaxed font-medium italic">
            "Fotos de modelos usando os óculos convertem 40% mais que apenas fotos do produto no fundo branco."
          </p>
        </div>
      </aside>

      {/* 2. ÁREA DE EDIÇÃO (5 colunas) */}
      <main className="lg:col-span-5 space-y-6">
        <form id="catalog-editor" className="space-y-6" onSubmit={async (e) => { e.preventDefault(); await handleSave(); }}>

          {activeTab === 'conteudo' && (
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="font-black italic text-lg">História da Marca</h3>
              <div className="space-y-4">
                <InputGroup
                  label="Frase de Impacto (Headline)"
                  placeholder="Ex: Luxo e Precisão Óptica"
                  value={formData.headline}
                  onChange={(v: string) => setFormData((p) => ({ ...p, headline: v }))}
                />
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Sobre a Distribuidora</label>
                  <textarea
                    rows={6}
                    value={formData.about_text}
                    onChange={(e) => setFormData((p) => ({ ...p, about_text: e.target.value }))}
                    className="w-full p-5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 text-sm font-medium"
                    placeholder="Conte sua trajetória..."
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'galeria' && (
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center">
                <h3 className="font-black italic text-lg">Mosaico Lifestyle</h3>
                <span className="text-[10px] font-bold text-slate-400">Máx. 6 fotos</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => {
                  const url = formData.gallery_urls[i]
                  return (
                    <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-slate-50 flex items-center justify-center relative">
                      {url ? (
                        <>
                          <img src={url} className="w-full h-full object-cover" />
                          <button
                            onClick={() => setFormData((p) => ({ ...p, gallery_urls: p.gallery_urls.filter((_, idx) => idx !== i) }))}
                            className="absolute top-2 right-2 bg-white/80 p-1 rounded-full"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center gap-2 text-slate-300 group">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleUpload}
                            disabled={loading}
                          />
                          <Plus className="text-slate-300 group-hover:text-primary" />
                        </label>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </form>
      </main>

      {/* 3. PREVIEW REAL-TIME (4 colunas) - O DIFERENCIAL */}
      <section className="lg:col-span-4 sticky top-8">
        <div className="bg-slate-900 rounded-[3.5rem] p-4 shadow-2xl border-[8px] border-slate-800 aspect-[9/19] relative overflow-hidden">
          {/* Status Bar Mockup */}
          <div className="h-6 flex justify-between items-center px-6 text-white/40 text-[10px] font-bold">
            <span>9:41</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-full bg-white/20" />
              <div className="w-3 h-3 rounded-full bg-white/20" />
            </div>
          </div>

          <div className="h-full overflow-y-auto no-scrollbar bg-white rounded-[2.5rem] mt-2">
            {/* Header Preview */}
            <div className="h-16 border-b flex items-center justify-center px-4">
              <div className="h-6 w-24 bg-slate-100 rounded animate-pulse" />
            </div>
            
            {/* Hero Preview */}
            <div className="h-40 bg-slate-200 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                 <div className="h-3 w-3/4 bg-white/30 rounded" />
               </div>
            </div>

            {/* About Preview */}
            <div className="p-6 space-y-2">
              <div className="h-2 w-full bg-slate-100 rounded" />
              <div className="h-2 w-full bg-slate-100 rounded" />
              <div className="h-2 w-2/3 bg-slate-100 rounded" />
            </div>

            {/* Grid Preview */}
            <div className="grid grid-cols-2 gap-2 p-4 pt-10">
               {[1,2,3,4].map(i => (
                 <div key={i} className="aspect-square bg-slate-50 rounded-xl" />
               ))}
            </div>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/80 backdrop-blur px-4 py-2 rounded-full border border-white/10">
            <Smartphone size={12} className="text-primary" />
            <span className="text-[10px] text-white font-black uppercase">Live Preview</span>
          </div>
        </div>
      </section>

    </div>
  )
}

function TabButton({ active, icon, label, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-4 p-5 rounded-2xl font-bold transition-all ${
        active
        ? 'bg-slate-900 text-white shadow-lg'
        : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
      }`}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  )
}

function InputGroup({ label, placeholder }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-400 uppercase ml-2">{label}</label>
      <input className="w-full h-14 px-5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 font-bold" placeholder={placeholder} />
    </div>
  )
}
