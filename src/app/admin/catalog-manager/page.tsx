'use server';

import React from 'react';
import RequireRole from '@/components/RequireRole';

export default async function Page() {
  return (
    <RequireRole allowedRoles={[ 'catalog_manager', 'admin_company', 'master' ]}>
      <div className="p-6">
        <h1 className="text-2xl font-black">Gestão de Catálogo</h1>
        <p className="mt-2 text-slate-600">Área para gerenciar produtos, imagens e descrições técnicas.</p>
      </div>
    </RequireRole>
  );
}
