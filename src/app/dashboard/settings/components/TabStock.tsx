import React from 'react';
import { Package, AlertTriangle, Zap } from 'lucide-react';
import { ToggleSetting } from '@/app/dashboard/settings/components/ToggleSetting';

export function TabStock(props: any) {
  const { catalogSettings, handleCatalogSettingsChange } = props;

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-gray-200 shadow-sm">
        <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-8"><Package size={18} /> Gestão de Inventário</h3>
        <ToggleSetting
          label="Bloquear venda sem estoque"
          name="manage_stock"
          description="Impede o fechamento do pedido se o item estiver zerado."
          checked={catalogSettings.manage_stock}
          onChange={handleCatalogSettingsChange}
          icon={AlertTriangle}
        >
          <div className="mt-6 p-6 bg-amber-50 rounded-3xl border border-amber-100">
            <ToggleSetting
              label="Permitir Encomenda (Backorder)"
              name="global_allow_backorder"
              description="O cliente pode pedir mesmo sem estoque, sob aviso de prazo."
              checked={catalogSettings.global_allow_backorder}
              onChange={handleCatalogSettingsChange}
              icon={Zap}
            />
          </div>
        </ToggleSetting>
      </div>
    </div>
  );
}

export default TabStock;
