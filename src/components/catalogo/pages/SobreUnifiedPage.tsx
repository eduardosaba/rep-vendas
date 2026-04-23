import { createClient } from '@/lib/supabase/server'
import { resolveContext } from '@/lib/resolve-context'
import { Award, ShieldCheck, Truck, Users } from 'lucide-react'
import React from 'react'
import { notFound } from 'next/navigation'

export default async function SobreEmpresaPage({ params }: any) {
  const resolved = await params
  const slug = Array.isArray(resolved?.slug)
    ? resolved.slug
    : resolved?.slug
      ? [resolved.slug]
      : resolved?.companySlug && resolved?.repSlug
        ? [resolved.companySlug, resolved.repSlug]
        : []
  const supabase = await createClient()
  const context = await resolveContext(slug, supabase as any)

  if (!context) return notFound()

  const isDistributor = context.type === 'distributor'
  const company = isDistributor ? context.company : null
  const representative = context.representative

  const pageName = company?.name || representative?.display_name || representative?.full_name || 'Catálogo'
  // Se existir uma página CMS com slug 'sobre', use seu conteúdo HTML como fonte única.
  let aboutText = company?.about_text || representative?.about || 'Atendimento consultivo com foco em mix ideal e reposição inteligente para sua ótica.'
  const headline = company?.headline || 'Compromisso com a Excelência Óptica'
  const coverImage = company?.cover_image || representative?.avatar_url || '/placeholder-eyewear.jpg'

  if (company?.id) {
    try {
      const { data: page } = await supabase
        .from('company_pages')
        .select('id,title,slug,content,is_active')
        .eq('company_id', company.id)
        .eq('slug', 'sobre')
        .eq('is_active', true)
        .maybeSingle();

      if (page && page.content) {
        // render HTML content from CMS page instead of plain about_text
        aboutText = page.content;
      }
    } catch (e) {
      // ignore and fallback to about_text
    }
  }
  const repFirstName = (representative?.display_name || representative?.full_name || 'Consultor').split(' ')[0]

  return (
    <div className="bg-white min-h-screen">
      <section className="relative h-[40vh] bg-slate-900 flex items-center justify-center overflow-hidden">
        <img
          src={coverImage}
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="relative z-10 text-center space-y-4">
          <h1 className="text-5xl md:text-7xl font-black italic text-white uppercase tracking-tighter">Nossa História</h1>
          <p className="text-primary font-bold tracking-[0.3em] uppercase text-sm">{pageName}</p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto py-20 px-6 space-y-12">
        <div className="space-y-6">
          <h2 className="text-3xl font-black italic text-slate-900">{headline}</h2>
          <div className="prose prose-slate prose-lg max-w-none italic text-slate-600 leading-relaxed">
            {/* Se aboutText contiver HTML (vindo do CMS), renderize como HTML; caso contrário, quebre em parágrafos */}
            {typeof aboutText === 'string' && /<[a-z][\s\S]*>/i.test(aboutText) ? (
              <div dangerouslySetInnerHTML={{ __html: aboutText }} />
            ) : (
              aboutText.split('\n').map((paragraph: string, i: number) => (
                <p key={i} className="mb-4">{paragraph}</p>
              ))
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t border-slate-100">
          <Feature icon={<ShieldCheck className="text-primary" />} title="Originalidade" desc="Garantia de procedência em todas as marcas globais." />
          <Feature icon={<Truck className="text-primary" />} title="Logística Ágil" desc="Entrega rápida para toda a região de Feira de Santana." />
          <Feature icon={<Award className="text-primary" />} title="Curadoria" desc="Seleção exclusiva baseada nas tendências europeias." />
        </div>
      </section>

      <section className="bg-slate-50 py-20 px-6">
        <div className="max-w-4xl mx-auto bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 flex flex-col md:flex-row items-center gap-10">
          <div className="w-40 h-40 bg-slate-200 rounded-full overflow-hidden flex-shrink-0">
            <div className="w-full h-full flex items-center justify-center text-4xl font-black text-slate-400">ES</div>
          </div>
          <div className="space-y-4 text-center md:text-left">
            <h3 className="text-2xl font-black italic text-slate-900">Seu Representante Oficial</h3>
            <p className="text-slate-600 font-medium">
              Eu sou o responsável por conectar a <strong>{pageName}</strong> ao seu negócio. Meu objetivo é garantir que sua ótica tenha o melhor mix de produtos e suporte técnico.
            </p>
            <button className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-sm hover:scale-105 transition-transform uppercase tracking-widest">Falar com {repFirstName} no WhatsApp</button>
          </div>
        </div>
      </section>
    </div>
  )
}

function Feature({ icon, title, desc }: any) {
  return (
    <div className="space-y-3">
      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">{icon}</div>
      <h4 className="font-black italic text-slate-900">{title}</h4>
      <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
    </div>
  )
}
