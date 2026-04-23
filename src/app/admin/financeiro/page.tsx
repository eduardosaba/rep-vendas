'use server';

import React from 'react';
import RequireRole from '@/components/RequireRole';
import RoleGuard from '@/components/auth/RoleGuard.client';
import Link from 'next/link';

export default async function Page() {
  return (
    <RequireRole allowedRoles={[ 'financeiro_company', 'admin_company', 'master' ]}>
      <RoleGuard allowedRoles={[ 'financeiro_company', 'admin_company', 'master' ]}>
        <div className="p-6">
          <h1 className="text-2xl font-black">Painel Financeiro</h1>
          <p className="mt-2 text-slate-600">Aqui o usuário financeiro aprova crédito, anexa NF e controla baixas.</p>
          <div className="mt-6">
            <Link
              href="/admin/financeiro/fechamento"
              className="inline-flex items-center px-4 py-2 rounded-xl bg-[var(--primary,#2563eb)] text-white font-semibold"
            >
              Abrir Fechamento Mensal
            </Link>
          </div>
          {/* Inserir componentes/relatórios financeiros aqui */}
        </div>
      </RoleGuard>
    </RequireRole>
  );
}
