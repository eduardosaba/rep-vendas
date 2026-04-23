'use server';

import React from 'react';
import RequireRole from '@/components/RequireRole';
import RoleGuard from '@/components/auth/RoleGuard.client';

export default async function Page() {
  return (
    <RequireRole allowedRoles={[ 'logistica_company', 'admin_company', 'master' ]}>
      <RoleGuard allowedRoles={[ 'logistica_company', 'admin_company', 'master' ]}>
        <div className="p-6">
          <h1 className="text-2xl font-black">Painel Logística & Expedição</h1>
          <p className="mt-2 text-slate-600">Área para separação, controle de expedição e impressão de picking lists.</p>
        </div>
      </RoleGuard>
    </RequireRole>
  );
}
