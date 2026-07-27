'use client'

import { useState } from 'react'
import { OrganizationSettings } from '@/domain/settings/organization-settings'
import { updateMyOrganizationSettings } from '@/actions/fulfillment/settings-actions'
import { toast } from 'sonner'
import { 
  Settings, 
  Scan, 
  ToggleLeft, 
  Save, 
  FileText, 
  Truck, 
  Coins, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react'

interface SettingsClientProps {
  initialSettings: OrganizationSettings
}

export function SettingsClient({ initialSettings }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<'operacao' | 'faturamento' | 'expedicao'>('operacao')
  const [loading, setLoading] = useState(false)

  // Estados dos inputs
  const [blindPicking, setBlindPicking] = useState(initialSettings.blind_picking_enabled)
  const [requireBarcode, setRequireBarcode] = useState(initialSettings.require_barcode_scan)
  const [allowManualQty, setAllowManualQty] = useState(initialSettings.allow_manual_quantity)
  
  const [autoCreateInvoice, setAutoCreateInvoice] = useState(initialSettings.auto_create_invoice_on_picking_completed)
  const [fiscalMode, setFiscalMode] = useState<'manual' | 'assisted' | 'automatic'>(
    (initialSettings.fiscal_mode || 'manual') as any
  )
  
  const [autoCreateShipment, setAutoCreateShipment] = useState(initialSettings.auto_create_shipment_on_invoice_issued)

  const handleSave = async () => {
    setLoading(true)
    try {
      const payload: Partial<OrganizationSettings> = {
        blind_picking_enabled: blindPicking,
        require_barcode_scan: requireBarcode,
        allow_manual_quantity: allowManualQty,
        auto_create_invoice_on_picking_completed: autoCreateInvoice,
        auto_create_shipment_on_invoice_issued: autoCreateShipment,
        fiscal_mode: fiscalMode,
        // Mantém a estrutura de JSONB do features_config sincronizada
        features_config: {
          fulfillment: {
            auto_create_invoice: autoCreateInvoice,
            auto_create_shipment: autoCreateShipment
          },
          fiscal: {
            mode: fiscalMode
          },
          notifications: {
            notify_customer_invoice: initialSettings.features_config?.notifications?.notify_customer_invoice ?? true,
            notify_customer_shipment: initialSettings.features_config?.notifications?.notify_customer_shipment ?? true
          }
        }
      }

      const res = await updateMyOrganizationSettings(payload)
      if (res.success) {
        toast.success('Configurações atualizadas com sucesso!')
      } else {
        toast.error(res.error || 'Falha ao atualizar configurações.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro inesperado ao salvar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[500px]">
      
      {/* Sidebar de Abas */}
      <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 space-y-1">
        <button
          onClick={() => setActiveTab('operacao')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'operacao'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Scan className="w-4 h-4" />
          Operação & WMS
        </button>

        <button
          onClick={() => setActiveTab('faturamento')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'faturamento'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Faturamento
        </button>

        <button
          onClick={() => setActiveTab('expedicao')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'expedicao'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          Expedição & Envio
        </button>
      </div>

      {/* Conteúdo Central */}
      <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
        <div className="space-y-6">
          
          {/* TAB: OPERAÇÃO */}
          {activeTab === 'operacao' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  Regras de Separação (WMS)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Defina o nível de rigor e validação exigidos no processo de picking.
                </p>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {/* BLIND PICKING */}
                <div className="flex items-start justify-between py-4">
                  <div className="max-w-[80%]">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Separação às Cegas (Blind Picking)
                    </label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                      O operador não vê a quantidade esperada do item durante a conferência, forçando a contagem física.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={blindPicking}
                    onChange={(e) => setBlindPicking(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 mt-1"
                  />
                </div>

                {/* REQUIRE BARCODE */}
                <div className="flex items-start justify-between py-4">
                  <div className="max-w-[80%]">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Scanner Obrigatório
                    </label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                      Exige o escaneamento do código de barras de cada produto antes de confirmar sua separação.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={requireBarcode}
                    onChange={(e) => setRequireBarcode(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 mt-1"
                  />
                </div>

                {/* ALLOW MANUAL QUANTITY */}
                <div className="flex items-start justify-between py-4">
                  <div className="max-w-[80%]">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Permitir Digitação Manual
                    </label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                      Permite que o operador informe a quantidade digitando no teclado em vez de bipar os itens individualmente.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowManualQty}
                    onChange={(e) => setAllowManualQty(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: FATURAMENTO */}
          {activeTab === 'faturamento' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Fluxo de Faturamento (Notas Fiscais)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Configure a geração automática de notas fiscais e a regra de emissão.
                </p>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {/* AUTO CREATE INVOICE */}
                <div className="flex items-start justify-between py-4">
                  <div className="max-w-[80%]">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Criar Pré-faturamento Automaticamente
                    </label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                      Ao concluir a PickList, o sistema cria automaticamente uma nota fiscal em rascunho (Draft).
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoCreateInvoice}
                    onChange={(e) => setAutoCreateInvoice(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 mt-1"
                  />
                </div>

                {/* FISCAL MODE */}
                <div className="py-4 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Modo Fiscal
                    </label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                      Selecione o nível de automação da emissão com o provedor fiscal.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    <label className={`border p-3.5 rounded-xl cursor-pointer flex flex-col justify-between transition-all ${
                      fiscalMode === 'manual' 
                        ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-900/10' 
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50/50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Manual</span>
                        <input
                          type="radio"
                          name="fiscal_mode"
                          value="manual"
                          checked={fiscalMode === 'manual'}
                          onChange={() => setFiscalMode('manual')}
                          className="w-3 h-3 text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 block">
                        O usuário cria e emite a NF-e manualmente.
                      </span>
                    </label>

                    <label className={`border p-3.5 rounded-xl cursor-pointer flex flex-col justify-between transition-all ${
                      fiscalMode === 'assisted' 
                        ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-900/10' 
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50/50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Assistido</span>
                        <input
                          type="radio"
                          name="fiscal_mode"
                          value="assisted"
                          checked={fiscalMode === 'assisted'}
                          onChange={() => setFiscalMode('assisted')}
                          className="w-3 h-3 text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 block">
                        Sistema cria rascunho e o usuário apenas revisa e confirma.
                      </span>
                    </label>

                    <label className={`border p-3.5 rounded-xl cursor-pointer flex flex-col justify-between transition-all ${
                      fiscalMode === 'automatic' 
                        ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-900/10' 
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50/50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Automático</span>
                        <input
                          type="radio"
                          name="fiscal_mode"
                          value="automatic"
                          checked={fiscalMode === 'automatic'}
                          onChange={() => setFiscalMode('automatic')}
                          className="w-3 h-3 text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 block">
                        Sistema emite e envia ao provedor fiscal automaticamente.
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: EXPEDIÇÃO */}
          {activeTab === 'expedicao' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Truck className="w-5 h-5 text-indigo-600" />
                  Fluxo Logístico de Expedição
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Configure as automatizações pós-autorização de notas fiscais.
                </p>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {/* AUTO CREATE SHIPMENT */}
                <div className="flex items-start justify-between py-4">
                  <div className="max-w-[80%]">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Criar Envio Automaticamente após Nota
                    </label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                      Ao autorizar a nota fiscal, cria automaticamente a ordem de expedição (Shipment) aguardando transportadora.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoCreateShipment}
                    onChange={(e) => setAutoCreateShipment(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 mt-1"
                  />
                </div>
              </div>
            </div>
          )}
          
        </div>

        {/* Botão de Ação */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>

      </div>

    </div>
  )
}
