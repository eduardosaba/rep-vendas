import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type TabsContextValue = {
  value: string | null;
  setValue: (v: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs({
  children,
  defaultValue,
  value,
  onValueChange,
  className,
}: {
  children: React.ReactNode;
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  className?: string;
}) {
  const [internal, setInternal] = useState<string | null>(defaultValue ?? null);

  useEffect(() => {
    if (value !== undefined) setInternal(value ?? null);
  }, [value]);

  const ctx = useMemo(() => ({ value: internal, setValue: (v: string) => {
    setInternal(v);
    onValueChange?.(v);
  }}), [internal, onValueChange]);

  return (
    <TabsContext.Provider value={ctx}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div role="tablist" className={className}>{children}</div>;
}

export function TabsTrigger({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = useContext(TabsContext);
  if (!ctx) return null;
  const isActive = ctx.value === value;
  return (
    <button
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? 'active' : 'inactive'}
      onClick={() => ctx.setValue(value)}
      className={className}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = useContext(TabsContext);
  if (!ctx) return null;
  const isActive = ctx.value === value;
  return (
    <div
      role="tabpanel"
      hidden={!isActive}
      data-state={isActive ? 'active' : 'inactive'}
      className={className}
    >
      {isActive ? children : null}
    </div>
  );
}

export default Tabs;
