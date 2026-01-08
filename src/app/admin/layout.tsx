'use client';

import React, { useState, useEffect } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Fecha o menu automaticamente em telas pequenas ao carregar
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarCollapsed(true);
    }
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors overflow-hidden">
      {/* 1. Sidebar recebe o estado centralizado */}
      <AdminSidebar 
        isCollapsed={isSidebarCollapsed} 
        setIsCollapsed={setIsSidebarCollapsed} 
      />

      {/* 2. Área de Conteúdo Principal */}
      <div className="flex flex-1 flex-col min-w-0 relative">
        {/* Header recebe a função de disparar o menu */}
        <AdminHeader onMenuClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
          {children}
        </main>

        {/* Overlay para mobile: fecha o menu ao clicar fora dele */}
        {!isSidebarCollapsed && (
          <div 
            className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarCollapsed(true)}
          />
        )}
      </div>
    </div>
  );
}