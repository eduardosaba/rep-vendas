import React from 'react'
import { TenantBranding } from '../branding-types'

interface TenantNameProps {
  branding: TenantBranding
  className?: string
}

export function TenantName({ branding, className = 'text-sm font-bold tracking-tight' }: TenantNameProps) {
  return (
    <span className={`${className} truncate`}>
      {branding.portal_name}
    </span>
  )
}
