import React from 'react'
import Image from 'next/image'
import { TenantBranding } from '../branding-types'

interface TenantLogoProps {
  branding: TenantBranding
  className?: string
}

export function TenantLogo({ branding, className = 'w-8 h-8' }: TenantLogoProps) {
  return (
    <div className={`${className} flex items-center justify-center overflow-hidden rounded bg-white/10 transition-all`}>
      {branding.logo_url ? (
        <Image 
          src={branding.logo_url} 
          alt={branding.portal_name} 
          width={64}
          height={64}
          className="object-contain max-w-full max-h-full p-1"
        />
      ) : (
        <span className="font-black text-xs text-white opacity-90">👓</span>
      )}
    </div>
  )
}
