import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { resolveCatalogScope } from '@/lib/catalog-scope'
import { redirect } from 'next/navigation'
import ProductWorkspace from './ProductWorkspace'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditarProdutoPage(props: PageProps) {
  const params = await props.params;
  const productId = params.id
  const supabase = await createClient()

  // 1. Resolve a sessão do usuário
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // 2. Resolve o escopo de catálogo inteligente (BUSINESS vs PERSONAL)
  const scope = resolveCatalogScope(profile, user)

  // 3. Monta a query blindada com o escopo
  let query = supabase
    .from('products')
    .select('*')
    .eq('id', productId)

  if (scope.type === 'BUSINESS') {
    if (!scope.organizationId) redirect('/distribuidora/produtos')
    query = query.eq('organization_id', scope.organizationId)
  } else {
    query = query.eq('user_id', user.id)
  }

  const { data: product, error } = await query.single()

  if (error || !product) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto mt-20 bg-white rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Produto não encontrado</h2>
        <p className="text-slate-500 mb-6">
          O produto não existe ou você não tem permissão de acesso neste contexto de catálogo ({scope.type}).
        </p>
        <a href="/distribuidora/produtos" className="text-blue-600 hover:underline">Voltar para o Catálogo</a>
      </div>
    )
  }

  // 4. Se encontrou, delega para a UI interativa do Workspace
  return <ProductWorkspace product={product} scope={scope} />
}
