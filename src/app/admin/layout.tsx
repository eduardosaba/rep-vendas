import React from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader'; // <--- Importe o Header

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
      {/* 1. Sidebar Fixo na Esquerda */}
      <AdminSidebar />

      {/* 2. Área de Conteúdo Principal */}
      <div className="flex flex-1 flex-col">
        {/* Header no Topo */}
        <AdminHeader />

        {/* Conteúdo da Página (Children) */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
