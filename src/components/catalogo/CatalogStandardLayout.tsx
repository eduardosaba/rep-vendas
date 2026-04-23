import { Storefront } from '@/components/catalogo/Storefront'

export default function CatalogStandardLayout({ catalog, initialProducts }: any) {
  return (
    <div className="min-h-screen bg-gray-50 pt-20 md:pt-24">
      <div className="max-w-[1920px] mx-auto px-4 lg:px-8 py-6 md:py-7 mt-2 md:mt-3">
        <Storefront catalog={catalog} initialProducts={initialProducts || []} startProductId={undefined} />
      </div>
    </div>
  )
}
