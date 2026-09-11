'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useOrganizationSelector } from '@/modules/organization-context/OrganizationProvider';
import { ORGANIZATION_TYPE_LABELS, MEMBER_ROLE_LABELS } from '@/domain/organizations/types';
import type { OrganizationType } from '@/domain/organizations/types';

const typeColors: Record<OrganizationType, string> = {
  independent_representative: 'bg-blue-100 text-blue-800',
  distributor: 'bg-purple-100 text-purple-800',
  optical_store: 'bg-green-100 text-green-800',
  catalog_template: 'bg-amber-100 text-amber-800',
};

export function OrganizationSelector() {
  const { memberships, currentOrgId, currentOrg, currentRole, currentType, switchOrganization, isLoading, hasMultipleOrgs } = useOrganizationSelector();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!hasMultipleOrgs && !isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800" ref={dropdownRef}>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
          {currentOrg?.name?.charAt(0).toUpperCase() || 'O'}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[160px]">
            {currentOrg?.name || 'Organização'}
          </p>
          {currentType && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${typeColors[currentType]}`}>
              {ORGANIZATION_TYPE_LABELS[currentType]}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800" ref={dropdownRef}>
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
        <div className="hidden sm:block">
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  const handleSwitch = async (orgId: string) => {
    try {
      await switchOrganization(orgId);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch organization:', error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full sm:w-auto"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
          {currentOrg?.name?.charAt(0).toUpperCase() || 'O'}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[160px]">
            {currentOrg?.name || 'Organização'}
          </p>
          {currentType && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${typeColors[currentType]}`}>
              {ORGANIZATION_TYPE_LABELS[currentType]}
            </span>
          )}
        </div>
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 animate-in fade-in-0 zoom-in-95">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Suas Organizações
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {memberships.map((membership) => {
              const org = membership.organization;
              const isActive = org?.id === currentOrgId;
              return (
                <button
                  key={org?.id}
                  onClick={() => handleSwitch(org!.id)}
                  disabled={isActive}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    isActive ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  } flex items-start gap-3`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 ${
                    typeColors[org?.organization_type as OrganizationType]?.replace('bg-', 'bg-').replace('text-', 'bg-') || 'bg-gray-500'
                  }`}>
                    {org?.name?.charAt(0).toUpperCase() || 'O'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                      {org?.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {org?.organization_type && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${typeColors[org.organization_type as OrganizationType]}`}>
                          {ORGANIZATION_TYPE_LABELS[org.organization_type as OrganizationType]}
                        </span>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {MEMBER_ROLE_LABELS[membership.role]}
                      </span>
                    </div>
                  </div>
                  {isActive && (
                    <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
          <div className="border-t border-gray-100 dark:border-gray-700 pt-2 px-3">
            <a
              href="/admin/organizations"
              className="block px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Gerenciar Organizações
            </a>
          </div>
        </div>
      )}
    </div>
  );
}