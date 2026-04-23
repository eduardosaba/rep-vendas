import React from 'react'

export function BrandSection({ brands }: { brands: Array<any> }) {
  return (
    <section className="py-16 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-10 text-center">
          Marcas Disponíveis nesta Distribuidora
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 items-center opacity-60 grayscale hover:grayscale-0 transition-all">
          {brands.map((brand) => (
            <img key={brand.id} src={brand.logo_url} alt={brand.name || brand.id} className="h-12 object-contain mx-auto" />
          ))}
        </div>
      </div>
    </section>
  )
}

export default BrandSection
