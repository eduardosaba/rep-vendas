'use client';

import React, { createContext, useContext, useState, useEffect, useTransition } from 'react';
import { 
  ActiveOrganizationContext, 
  UserOrganizationSummary 
} from '@/domain/organizations/types';
import { 
  getActiveOrganizationAction, 
  setActiveOrganizationAction 
} from '@/actions/organization/context-actions';

interface OrganizationContextValue {
  activeOrganization: ActiveOrganizationContext | null;
  userOrganizations: UserOrganizationSummary[];
  isMaster: boolean;
  isLoading: boolean;
  isPending: boolean;
  switchOrganization: (organizationId: string) => Promise<{ success: boolean; error?: string }>;
  reloadContext: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [activeOrganization, setActiveOrganization] = useState<ActiveOrganizationContext | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<UserOrganizationSummary[]>([]);
  const [isMaster, setIsMaster] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const loadContext = async () => {
    try {
      setIsLoading(true);
      const res = await getActiveOrganizationAction();
      setActiveOrganization(res.activeOrganization);
      setUserOrganizations(res.userOrganizations);
      setIsMaster(res.isMaster);
    } catch (err) {
      console.error('[OrganizationProvider] Erro ao carregar contexto:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContext();
  }, []);

  const switchOrganization = async (organizationId: string): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      startTransition(async () => {
        const res = await setActiveOrganizationAction(organizationId);
        if (res.isValid && res.organization) {
          setActiveOrganization(res.organization);
          resolve({ success: true });
        } else {
          resolve({ success: false, error: res.reason || 'Não foi possível alterar a organização ativa.' });
        }
      });
    });
  };

  return (
    <OrganizationContext.Provider
      value={{
        activeOrganization,
        userOrganizations,
        isMaster,
        isLoading,
        isPending,
        switchOrganization,
        reloadContext: loadContext,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization deve ser usado dentro de um <OrganizationProvider>');
  }
  return context;
}
