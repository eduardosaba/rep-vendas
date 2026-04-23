import React from 'react';

export default function CompanyDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard da Distribuidora</h1>
      <p className="text-sm text-gray-600 mb-6">Visão geral de vendas, ranking e indicadores.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border">Vendas (Mês)</div>
        <div className="p-4 bg-white rounded-xl border">Clientes Ativos</div>
        <div className="p-4 bg-white rounded-xl border">Faturas Pendentes</div>
      </div>
    </div>
  );
}
