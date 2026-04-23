"use client"

import React, { createContext, useContext } from 'react'

const RepContext = createContext<any | null>(null)

export function RepProvider({ rep, children }: { rep: any; children: React.ReactNode }) {
  return <RepContext.Provider value={rep}>{children}</RepContext.Provider>
}

export function useRep() {
  return useContext(RepContext)
}

export default RepProvider
