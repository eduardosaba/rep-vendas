export default function AdminMetricsPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Métricas do Sistema
      </h1>

      {/* Gráfico de Barras (CSS Puro) - Simulação de Acessos */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm">
        <h3 className="text-lg font-semibold mb-6">
          Acessos nos últimos 7 dias
        </h3>
        <div className="flex items-end justify-between h-48 gap-2">
          {[40, 70, 45, 90, 65, 80, 95].map((h, i) => (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-2 group"
            >
              <div
                className="w-full bg-[var(--primary)]/20 dark:bg-[var(--primary)]/20 rounded-t-lg relative group-hover:bg-[var(--primary)]/30 transition-all"
                style={{ height: `${h}%` }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  {h * 12}
                </div>
              </div>
              <span className="text-xs text-gray-500">Dia {i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm">
          <h3 className="font-bold mb-4">Uso de Armazenamento</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Imagens de Produtos</span>
                <span className="font-bold">45GB / 100GB</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: '45%' }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Banco de Dados</span>
                <span className="font-bold">1.2GB / 5GB</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{ width: '24%' }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm">
          <h3 className="font-bold mb-4">Saúde do Sistema</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">99.9%</div>
              <div className="text-xs text-green-800 dark:text-green-300">
                Uptime
              </div>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">120ms</div>
              <div className="text-xs text-blue-800 dark:text-blue-300">
                Latência Média
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
