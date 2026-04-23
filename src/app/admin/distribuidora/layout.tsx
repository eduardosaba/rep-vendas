import React from 'react';

export default function AdminDistribuidoraLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Painel da Distribuidora</h1>
      </header>
      <div className="grid grid-cols-4 gap-6">
        <nav className="col-span-1">
          <ul className="space-y-2">
            <li><a href="/admin/distribuidora/estoque" className="text-blue-600">Estoque Unificado</a></li>
            <li><a href="/admin/distribuidora/equipe" className="text-blue-600">Equipe</a></li>
            <li><a href="/admin/distribuidora/crm" className="text-blue-600">CRM</a></li>
            <li><a href="/admin/distribuidora/configuracoes" className="text-blue-600">Configurações de Marca</a></li>
            <li><a href="/admin/distribuidora/pedidos" className="text-blue-600">Pedidos</a></li>
          </ul>
        </nav>
        <main className="col-span-3 bg-white p-4 rounded shadow">{children}</main>
      </div>
    </div>
  );
}
