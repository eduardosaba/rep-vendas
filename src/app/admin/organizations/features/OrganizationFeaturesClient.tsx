'use client';

import React, { useState } from 'react';
import type { OrganizationType } from '@/domain/organizations/types';

interface Organization {
  id: string;
  name: string;
  slug: string;
  organization_type: OrganizationType;
  status: string;
  is_active: boolean;
}

interface FeatureFlag {
  organization_id: string;
  feature_key: string;
  enabled: boolean;
}

interface FeatureFlagsPageProps {
  initialOrganizations: Organization[];
  initialFeatureFlags: FeatureFlag[];
}

const FEATURE_KEYS = [
  { key: 'organization_context_enabled', label: 'Contexto Organizacional', description: 'Habilita seletor de organização e contexto multi-tenant' },
  { key: 'distributor_portal_enabled', label: 'Portal Distribuidora', description: 'Habilita portal específico para distribuidoras' },
  { key: 'optical_store_enabled', label: 'Portal Ótica', description: 'Habilita portal específico para óticas compradoras' },
  { key: 'b2b_relationships_enabled', label: 'Relacionamentos B2B', description: 'Habilita vínculos distribuidora-ótica e catálogos autorizados' },
  { key: 'organization_products_enabled', label: 'Produtos por Organização', description: 'Habilita CRUD de produtos isolados por organization_id' },
  { key: 'dual_order_status_enabled', label: 'Status Duplo de Pedidos', description: 'Habilita status comercial + operacional separados' },
  { key: 'catalog_template_clone_enabled', label: 'Clonagem de Catálogo Modelo', description: 'Habilita clonagem de catalog_template para organizações' },
] as const;

const TYPE_COLORS: Record<OrganizationType, string> = {
  independent_representative: 'bg-blue-100 text-blue-800',
  distributor: 'bg-purple-100 text-purple-800',
  optical_store: 'bg-green-100 text-green-800',
  catalog_template: 'bg-amber-100 text-amber-800',
};

const TYPE_LABELS: Record<OrganizationType, string> = {
  independent_representative: 'Rep. Independente',
  distributor: 'Distribuidora',
  optical_store: 'Ótica',
  catalog_template: 'Catálogo Modelo',
};

export function OrganizationFeaturesClient({ 
  initialOrganizations, 
  initialFeatureFlags 
}: FeatureFlagsPageProps) {
  const [organizations] = useState(initialOrganizations);
  const [featureFlags, setFeatureFlags] = useState(initialFeatureFlags);
  const [toggling, setToggling] = useState<string | null>(null);

  const getFlagKey = (orgId: string, featureKey: string) => `${orgId}-${featureKey}`;

  const isEnabled = (orgId: string, featureKey: string) => {
    const flag = featureFlags.find(f => f.organization_id === orgId && f.feature_key === featureKey);
    return flag?.enabled ?? false;
  };

  const handleToggle = async (orgId: string, featureKey: string, currentValue: boolean) => {
    const flagId = getFlagKey(orgId, featureKey);
    setToggling(flagId);
    
    try {
      const response = await fetch('/api/admin/organizations/features/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId, featureKey, enabled: !currentValue }),
      });

      if (!response.ok) throw new Error('Failed to toggle');

      setFeatureFlags(prev => prev.map(f => 
        f.organization_id === orgId && f.feature_key === featureKey 
          ? { ...f, enabled: !currentValue }
          : f
      ));
    } catch (error) {
      console.error('Failed to toggle feature flag:', error);
      alert('Erro ao alterar feature flag');
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Feature Flags por Organização</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Ative/desative funcionalidades granularmente por organização. Apenas usuários <code>master</code> podem alterar.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-64">
                Organização
              </th>
              {FEATURE_KEYS.map(({ key, label }) => (
                <th key={key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-40">
                  <div className="max-w-xs" title={FEATURE_KEYS.find(f => f.key === key)?.description || ''}>
                    {label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {organizations.map((org) => (
              <tr key={org.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${TYPE_COLORS[org.organization_type]}`}>
                        {TYPE_LABELS[org.organization_type]}
                      </span>
                      {org.status !== 'active' && (
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          {org.status}
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white mt-1">{org.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{org.slug}</p>
                  </div>
                </td>
                {FEATURE_KEYS.map(({ key }) => {
                  const enabled = isEnabled(org.id, key);
                  const flagId = getFlagKey(org.id, key);
                  return (
                    <td key={key} className="px-4 py-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => handleToggle(org.id, key, enabled)}
                          disabled={toggling === flagId}
                          className="sr-only peer"
                        />
                        <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600`}></div>
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {organizations.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Nenhuma organização encontrada.
        </div>
      )}
    </div>
  );
}