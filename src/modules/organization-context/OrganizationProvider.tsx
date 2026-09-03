'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { OrganizationContext, OrganizationMember, OrganizationType, MemberRole } from '@/domain/organizations/types';

interface OrganizationProviderProps {
  children: ReactNode;
  initialContext?: OrganizationContext;
}

const OrganizationContext = createContext<{
  context: OrganizationContext | null;
  setActiveOrganization: (orgId: string) => Promise<void>;
  refreshContext: () => Promise<void>;
  isLoading: boolean;
} | null>(null);

export function OrganizationProvider({ children, initialContext }: OrganizationProviderProps) {
  const [context, setContext] = useState<OrganizationContext | null>(initialContext || null);
  const [isLoading, setIsLoading] = useState(!initialContext);

  const fetchContext = useCallback(async () => {
    try {
      const response = await fetch('/api/organization-context', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setContext(data);
      }
    } catch (error) {
      console.error('Failed to fetch organization context:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialContext) {
      fetchContext();
    }
  }, [fetchContext, initialContext]);

  const setActiveOrganization = useCallback(async (orgId: string) => {
    try {
      const response = await fetch('/api/organization-context/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId }),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setContext(data);
      } else {
        throw new Error('Failed to switch organization');
      }
    } catch (error) {
      console.error('Failed to switch organization:', error);
      throw error;
    }
  }, []);

  const refreshContext = useCallback(async () => {
    const response = await fetch('/api/organization-context', {
      credentials: 'include',
    });
    if (response.ok) {
      const data = await response.json();
      setContext(data);
    }
  }, []);

  return (
    <OrganizationContext.Provider value={{ context, setActiveOrganization, refreshContext, isLoading }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return ctx;
}

export function useOrganizationSelector() {
  const { context, setActiveOrganization, isLoading } = useOrganization();
  
  const memberships = context?.memberships || [];
  const currentOrgId = context?.organizationId;
  const currentOrg = context?.organization;
  const currentRole = context?.memberRole;
  const currentType = context?.organizationType;

  const switchOrganization = useCallback(async (orgId: string) => {
    await setActiveOrganization(orgId);
  }, [setActiveOrganization]);

  return {
    memberships,
    currentOrgId,
    currentOrg,
    currentRole,
    currentType,
    switchOrganization,
    isLoading,
    hasMultipleOrgs: memberships.length > 1,
  };
}

export function useCurrentOrganization() {
  const { context } = useOrganization();
  return context;
}

export function useOrganizationPermissions() {
  const { context } = useOrganization();
  return context?.permissions || [];
}

export function useHasPermission(permission: string) {
  const permissions = useOrganizationPermissions();
  return permissions.includes(permission);
}

export function useIsOrgType(...types: OrganizationType[]) {
  const { context } = useOrganization();
  if (!context?.organizationType) return false;
  return types.includes(context.organizationType);
}

export function useIsRole(...roles: MemberRole[]) {
  const { context } = useOrganization();
  if (!context?.memberRole) return false;
  return roles.includes(context.memberRole);
}