'use server';

import React from 'react';
import {
  getCompanyProducts,
  createProductFromForm,
  deleteProductFromForm,
  updateProductFromForm,
} from './actions';

export default async function Page() {
  const res = await getCompanyProducts();
  const products = res.success ? res.data || [] : [];

  // Wrapper actions adapt server action return types to void for form.action typing
  async function createProductAction(formData: FormData) {
    'use server';
    await createProductFromForm(formData);
  }

  async function deleteProductAction(formData: FormData) {
    'use server';
    await deleteProductFromForm(formData);
  }

  async function updateProductAction(formData: FormData) {
    'use server';
    await updateProductFromForm(formData);
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Produtos da Empresa</h1>

      <section className="mb-6">
        <h2 className="font-medium mb-2">Criar Produto</h2>
        <form action={createProductAction} className="space-y-2 max-w-md">
          <div>
            <label className="block text-sm">Nome</label>
            <input name="name" required className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="block text-sm">SKU</label>
            <input name="sku" className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="block text-sm">Preço</label>
            <input name="price" type="number" step="0.01" className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="block text-sm">Quantidade em estoque</label>
            <input name="stock_quantity" type="number" className="w-full border rounded px-2 py-1" />
          </div>
          <div className="flex items-center gap-2">
            <input id="manage_stock" name="manage_stock" type="checkbox" />
            <label htmlFor="manage_stock" className="text-sm">Gerenciar estoque</label>
          </div>
          <div>
            <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded">Criar</button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="font-medium mb-2">Lista de Produtos ({products.length})</h2>
        <table className="w-full border-collapse border">
          <thead>
            <tr className="text-left">
              <th className="p-2 border">Nome</th>
              <th className="p-2 border">SKU</th>
              <th className="p-2 border">Preço</th>
              <th className="p-2 border">Estoque</th>
              <th className="p-2 border">Ações</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p: any) => (
              <React.Fragment key={p.id}>
                <tr>
                  <td className="p-2 border">{p.name}</td>
                  <td className="p-2 border">{p.sku}</td>
                  <td className="p-2 border">{p.price}</td>
                  <td className="p-2 border">{p.stock_quantity ?? '-'}</td>
                  <td className="p-2 border">
                    <form action={deleteProductAction} method="post">
                      <input type="hidden" name="id" value={p.id} />
                      <button className="px-2 py-1 bg-red-600 text-white rounded" type="submit">Excluir</button>
                    </form>
                  </td>
                </tr>
                <tr>
                  <td colSpan={5} className="p-2 border bg-gray-50">
                    <form action={updateProductAction} className="grid grid-cols-4 gap-2 items-end">
                      <input type="hidden" name="id" defaultValue={p.id} />
                      <div>
                        <label className="block text-sm">Nome</label>
                        <input name="name" defaultValue={p.name} className="w-full border rounded px-2 py-1" />
                      </div>
                      <div>
                        <label className="block text-sm">SKU</label>
                        <input name="sku" defaultValue={p.sku} className="w-full border rounded px-2 py-1" />
                      </div>
                      <div>
                        <label className="block text-sm">Preço</label>
                        <input name="price" defaultValue={p.price} type="number" step="0.01" className="w-full border rounded px-2 py-1" />
                      </div>
                      <div>
                        <label className="block text-sm">Estoque</label>
                        <input name="stock_quantity" defaultValue={p.stock_quantity ?? ''} type="number" className="w-full border rounded px-2 py-1" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm">Imagem (opcional)</label>
                        <input name="image" type="file" accept="image/*" />
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="px-2 py-1 bg-green-600 text-white rounded">Salvar</button>
                      </div>
                    </form>
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
