'use client';

import React, { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Building2, ChevronDown, Check, ShieldAlert, BookOpen, Store, Award } from 'lucide-react';
import { OrganizationType } from '@/domain/organizations/types';

const getOrgTypeLabel = (type: OrganizationType) => {
  switch (type) {
    case 'catalog_template':
      return { label: 'Biblioteca Mestre', badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' };
    case 'optical_store':
      return { label: 'Ótica Compradora', badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' };
    case 'distributor':
      return { label: 'Distribuidora B2B', badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' };
    case 'independent_representative':
    default:
      return { label: 'Representante', badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
  }
};

export function OrganizationSwitcher() {
  const { activeOrganization, userOrganizations, switchOrganization, isPending, isLoading } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading || !activeOrganization) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 animate-pulse">
        <Building2 className="w-4 h-4 text-slate-400" />
        <span className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded"></span>
      </div>
    );
  }

  const currentTypeInfo = getOrgTypeLabel(activeOrganization.organization_type);

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending || userOrganizations.length <= 1}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-850 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
      >
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
          {activeOrganization.is_template_catalog ? (
            <BookOpen className="w-3.5 h-3.5" />
          ) : activeOrganization.organization_type === 'optical_store' ? (
            <Store className="w-3.5 h-3.5" />
          ) : (
            <Building2 className="w-3.5 h-3.5" />
          )}
        </div>

        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold max-w-[140px] truncate">
              {activeOrganization.name}
            </span>
            <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${currentTypeInfo.badgeClass}`}>
              {currentTypeInfo.label}
            </span>
          </div>
        </div>

        {userOrganizations.length > 1 && (
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Dropdown de Alternância de Organização */}
      {isOpen && userOrganizations.length > 1 && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 py-1 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            <div className="px-3 py-2 text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Suas Empresas e Organizações
            </div>

            <div className="max-h-60 overflow-y-auto py-1">
              {userOrganizations.map((org) => {
                const isSelected = org.id === activeOrganization.id;
                const typeInfo = getOrgTypeLabel(org.organization_type);

                return (
                  <button
                    key={org.id}
                    onClick={async () => {
                      setIsOpen(false);
                      if (!isSelected) {
                        await switchOrganization(org.id);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                      isSelected ? 'bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="font-medium truncate">{org.name}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`text-[9px] px-1 rounded font-medium ${typeInfo.badgeClass}`}>
                          {typeInfo.label}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">
                          • {org.role}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {activeOrganization.is_template_catalog && (
              <div className="p-2.5 bg-purple-50 dark:bg-purple-950/30 text-purple-800 dark:text-purple-300 rounded-b-xl flex items-start gap-2 text-[11px]">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
                <span>
                  <strong>Biblioteca Mestre:</strong> Modo de consulta e clonagem de acervo. Operações comerciais de compra e venda são desabilitadas neste contexto.
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
