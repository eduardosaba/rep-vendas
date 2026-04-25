import { ToggleSetting } from '@/app/dashboard/settings/components/ToggleSetting';
import { DollarSign, Image as ImageIcon, Zap } from 'lucide-react';

export function TabDisplay(props: any) {
  const {
    catalogSettings,
    setCatalogSettings,
    handleCatalogSettingsChange,
    topBenefitImagePreview,
    setTopBenefitImagePreview,
    topBenefitHeight,
    setTopBenefitHeight,
    topBenefitTextSize,
    setTopBenefitTextSize,
    topBenefitBgColor,
    setTopBenefitBgColor,
    topBenefitTextColor,
    setTopBenefitTextColor,
    topBenefitImageFit,
    setTopBenefitImageFit,
    topBenefitImageScale,
    setTopBenefitImageScale,
    topBenefitTextAlign,
    setTopBenefitTextAlign,
    topBenefitImageAlign,
  } = props;

  const safeCatalog = catalogSettings || {};
  const safeTopBenefitHeight = topBenefitHeight ?? safeCatalog.top_benefit_height ?? 40;
  const safeTopBenefitBgColor = topBenefitBgColor ?? safeCatalog.top_benefit_bg_color ?? '#0d1b2c';
  const safeTopBenefitTextColor = topBenefitTextColor ?? safeCatalog.top_benefit_text_color ?? '#ffffff';
  const safeTopBenefitImagePreview = topBenefitImagePreview ?? safeCatalog.top_benefit_image_url ?? null;
  const safeTopBenefitMode = safeCatalog.top_benefit_mode ?? 'static';
  const safeTopBenefitAnimation = safeCatalog.top_benefit_animation ?? 'scroll_left';
  const safeTopBenefitSpeed = safeCatalog.top_benefit_speed ?? 'medium';
  const safeImageScale = safeCatalog.top_benefit_image_scale ?? 100;
  const safePriceUnlockMode = safeCatalog.price_unlock_mode ?? 'none';

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      {props.loading && (
        <div className="flex items-center justify-center">
          <span className="inline-block px-3 py-1 text-xs font-bold bg-amber-100 text-amber-800 rounded-full">Carregando configurações...</span>
        </div>
      )}
      <div className="bg-white dark:bg-slate-900 p-5 md:p-8 rounded-[2rem] border border-gray-200 shadow-sm space-y-6">
        <ToggleSetting
          label="Ativar Barra de Benefícios"
          name="show_top_benefit_bar"
          description="Exibe uma faixa promocional ou informativa no topo do catálogo."
          checked={!!safeCatalog.show_top_benefit_bar}
          onChange={handleCatalogSettingsChange}
          icon={Zap}
          disabled={props.loading}
        >
          <div className="space-y-6 pt-6 border-t mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Texto da Mensagem</label>
                  <input type="text" name="top_benefit_text" value={safeCatalog.top_benefit_text ?? ''} onChange={handleCatalogSettingsChange} disabled={props.loading} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-sm focus:ring-2 focus:ring-primary" placeholder="Ex: Frete Grátis para toda Bahia!" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Modo da Barra</label>
                  <select
                    name="top_benefit_mode"
                    value={safeTopBenefitMode}
                    onChange={handleCatalogSettingsChange}
                    disabled={props.loading}
                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-sm focus:ring-2 focus:ring-primary"
                  >
                    <option value="static">Estática</option>
                    <option value="marquee">Animada (letreiro)</option>
                  </select>
                  <p className="text-xs text-slate-500">No modo animado, o texto rola continuamente no estilo letreiro.</p>
                </div>

                {catalogSettings.top_benefit_mode === 'marquee' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tipo de animação</label>
                      <select
                        name="top_benefit_animation"
                        value={safeTopBenefitAnimation}
                        onChange={handleCatalogSettingsChange}
                        disabled={props.loading}
                        className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-sm focus:ring-2 focus:ring-primary"
                      >
                        <option value="scroll_left">Letreiro para esquerda</option>
                        <option value="scroll_right">Letreiro para direita</option>
                        <option value="alternate">Vai e volta</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Velocidade</label>
                      <select
                        name="top_benefit_speed"
                        value={safeTopBenefitSpeed}
                        onChange={handleCatalogSettingsChange}
                        disabled={props.loading}
                        className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-sm focus:ring-2 focus:ring-primary"
                      >
                        <option value="slow">Lenta</option>
                        <option value="medium">Média</option>
                        <option value="fast">Rápida</option>
                      </select>
                    </div>
                  </>
                ) : null}

                <div className="grid grid-cols-2 gap-4 p-5 bg-slate-50 dark:bg-slate-800 rounded-[2rem]">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Fundo</label>
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200">
                      <input
                        type="color"
                        value={safeTopBenefitBgColor}
                        onChange={(e: any) => {
                          const v = e.target.value;
                          setTopBenefitBgColor(v);
                          if (setCatalogSettings) setCatalogSettings((p: any) => ({ ...(p || {}), top_benefit_bg_color: v }));
                          if (handleCatalogSettingsChange) handleCatalogSettingsChange({ target: { name: 'top_benefit_bg_color', value: v } } as any);
                        }}
                        disabled={props.loading}
                        className="h-8 w-8 rounded-lg cursor-pointer border-none"
                      />
                      <span className="hidden sm:inline text-[10px] font-mono uppercase">{topBenefitBgColor}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Texto</label>
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200">
                      <input
                        type="color"
                        value={safeTopBenefitTextColor}
                        onChange={(e: any) => {
                          const v = e.target.value;
                          setTopBenefitTextColor(v);
                          if (setCatalogSettings) setCatalogSettings((p: any) => ({ ...(p || {}), top_benefit_text_color: v }));
                          if (handleCatalogSettingsChange) handleCatalogSettingsChange({ target: { name: 'top_benefit_text_color', value: v } } as any);
                        }}
                        disabled={props.loading}
                        className="h-8 w-8 rounded-lg cursor-pointer border-none"
                      />
                      <span className="hidden sm:inline text-[10px] font-mono uppercase">{topBenefitTextColor}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex flex-col sm:flex-row items-center gap-4">
                  <div className="h-20 w-20 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-white overflow-hidden shrink-0 shadow-sm">
                    {safeTopBenefitImagePreview ? (
                      <img src={safeTopBenefitImagePreview} className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="text-slate-200" size={28} />
                    )}
                  </div>
                  <div className="flex flex-col gap-2 w-full sm:w-auto">
                      <label className={`text-center sm:text-left px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase ${props.loading ? 'opacity-70 pointer-events-none' : 'cursor-pointer hover:bg-primary'} transition-all shadow-md`}>Escolher Ícone/Imagem
                      <input type="file" className="hidden" accept="image/*" disabled={props.loading} onChange={(e: any) => { const f = e.target.files?.[0]; if (f) setTopBenefitImagePreview(URL.createObjectURL(f)); }} />
                    </label>
                    {topBenefitImagePreview && (<button onClick={() => setTopBenefitImagePreview(null)} className="text-[10px] font-black text-red-500 uppercase tracking-tighter hover:underline">Remover Imagem</button>)}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] space-y-6">
                      <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black uppercase text-slate-400">Altura da Barra</label>
                      <span className="text-xs font-bold text-primary">{safeTopBenefitHeight}px</span>
                    </div>
                    <input type="range" min="24" max="80" value={safeTopBenefitHeight} onChange={(e: any) => setTopBenefitHeight(Number(e.target.value))} disabled={props.loading} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary" />
                  </div>
                  <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black uppercase text-slate-400">Escala da Imagem (%)</label>
                      <span className="text-xs font-bold text-primary">{safeImageScale}%</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={200}
                      value={safeImageScale}
                      onChange={(e: any) => setCatalogSettings((p: any) => ({ ...(p||{}), top_benefit_image_scale: Number(e.target.value) }))}
                      disabled={props.loading}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={50}
                        max={200}
                        value={safeImageScale}
                        onChange={(e: any) => {
                          const v = Number(e.target.value) || 0;
                          const clamped = Math.min(200, Math.max(50, v));
                          setCatalogSettings((p: any) => ({ ...(p||{}), top_benefit_image_scale: clamped }));
                        }}
                        disabled={props.loading}
                        className="w-24 p-2 rounded-lg border"
                      />
                      <div className="text-xs text-slate-500">(50-200)</div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-[9px] font-black uppercase text-slate-400 text-center tracking-widest">Visualização ao vivo</p>
                    {safeTopBenefitMode === 'marquee' ? (
                      <div style={{ backgroundColor: safeTopBenefitBgColor, color: safeTopBenefitTextColor, height: safeTopBenefitHeight, fontSize: Math.min(safeTopBenefitHeight * 0.4, 18) }} className="w-full rounded-2xl px-4 shadow-inner relative overflow-hidden font-black transition-all flex items-center">
                        <div
                          className="whitespace-nowrap flex items-center gap-8"
                          style={{
                            animationName: 'rv-top-benefit-preview',
                            animationDuration:
                              safeTopBenefitSpeed === 'slow'
                                ? '20s'
                                : safeTopBenefitSpeed === 'fast'
                                  ? '8s'
                                  : '12s',
                            animationTimingFunction:
                              safeTopBenefitAnimation === 'alternate'
                                ? 'ease-in-out'
                                : 'linear',
                            animationIterationCount: 'infinite',
                            animationDirection:
                              safeTopBenefitAnimation === 'scroll_right'
                                ? 'reverse'
                                : safeTopBenefitAnimation === 'alternate'
                                  ? 'alternate'
                                  : 'normal',
                          }}
                        >
                          <span>{catalogSettings.top_benefit_text || 'Sua Mensagem Aqui'}</span>
                          <span>{catalogSettings.top_benefit_text || 'Sua Mensagem Aqui'}</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ backgroundColor: safeTopBenefitBgColor, color: safeTopBenefitTextColor, height: safeTopBenefitHeight, fontSize: Math.min(safeTopBenefitHeight * 0.4, 18) }} className="w-full rounded-2xl flex items-center justify-center px-4 shadow-inner relative overflow-hidden font-black transition-all">
                        {safeTopBenefitImagePreview && (<img src={safeTopBenefitImagePreview} style={{ height: '70%', marginRight: '8px' }} className="object-contain" />)}
                        <span className="truncate">{safeCatalog.top_benefit_text || 'Sua Mensagem Aqui'}</span>
                      </div>
                    )}
                    <style jsx>{`
                      @keyframes rv-top-benefit-preview {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-50%); }
                      }
                    `}</style>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ToggleSetting>
      </div>
      <div className="bg-white dark:bg-slate-900 p-5 md:p-8 rounded-[2.5rem] border border-gray-200 shadow-sm space-y-8">
        <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 flex items-center gap-2"><DollarSign size={18} /> Preços e Negócio</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          <div className="p-4 md:p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl">
            <ToggleSetting label="Preço Sugerido" name="show_sale_price" description="Exibe o valor final para o consumidor." checked={catalogSettings.show_sale_price} onChange={(e: any) => { setCatalogSettings((p: any) => ({ ...p, show_sale_price: e.target.checked, show_cost_price: !e.target.checked })); }} icon={DollarSign} />
          </div>
          <div className="p-4 md:p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl">
            <ToggleSetting label="Preço de Custo" name="show_cost_price" description="Exibe o valor para o lojista." checked={catalogSettings.show_cost_price} onChange={(e: any) => { setCatalogSettings((p: any) => ({ ...p, show_cost_price: e.target.checked, show_sale_price: !e.target.checked })); }} icon={ImageIcon} />
          </div>
        </div>

        <div className="p-4 md:p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Modo de desbloqueio de preços</label>
          <select name="price_unlock_mode" value={catalogSettings.price_unlock_mode} onChange={(e: any) => setCatalogSettings((p: any) => ({ ...p, price_unlock_mode: e.target.value }))} className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm font-medium">
            <option value="none">Apenas botão nos produtos</option>
            <option value="modal">Popup ao entrar (centralizado)</option>
            <option value="fab">Botão flutuante (canto da tela)</option>
          </select>
          <p className="text-xs text-slate-500 mt-2">Essa opção só é usada quando o catálogo está com preços restritos.</p>
        </div>
      </div>
    </div>
  );
}

export default TabDisplay;
