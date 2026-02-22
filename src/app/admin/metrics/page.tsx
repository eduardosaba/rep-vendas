import {
  BarChart3,
  Database,
  HardDrive,
  Activity,
  Server,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

export default function AdminMetricsPage() {
  // Gera os últimos 7 dias dinamicamente para o eixo X
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  });

  // Dados simulados (normalizados de 0 a 100 para altura %)
  const data = [40, 70, 45, 90, 65, 80, 95];

  return (
    <div className="space-y-8 animate-in fade-in pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="text-indigo-600" /> Métricas do Sistema
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Monitoramento em tempo real da infraestrutura e acessos.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold rounded-full flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Sistema Operacional
          </span>
        </div>
      </div>

      {/* GRÁFICO DE ACESSOS (CSS PURO MELHORADO) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
            <BarChart3 size={20} className="text-gray-400" />
            Tráfego Semanal
          </h3>
          <div className="text-sm text-green-600 font-medium flex items-center gap-1">
            <TrendingUp size={16} /> +12.5% vs semana anterior
          </div>
        </div>

        <div className="relative h-64 w-full">
          {/* Linhas de Grade (Grid Background) */}
          <div className="absolute inset-0 flex flex-col justify-between text-xs text-gray-400 pointer-events-none">
            {[100, 75, 50, 25, 0].map((val) => (
              <div
                key={val}
                className="flex items-center w-full border-b border-gray-100 dark:border-slate-800 last:border-0 h-full"
              >
                <span className="w-8 -mt-6">{val * 12}</span>{' '}
                {/* Simulação de escala real */}
              </div>
            ))}
          </div>

          {/* Barras do Gráfico */}
          <div className="absolute inset-0 flex items-end justify-between pl-8 gap-2 sm:gap-4 pt-4">
            {data.map((h, i) => (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end"
              >
                {/* Tooltip Customizado */}
                <div className="absolute bottom-[calc(100%+8px)] bg-gray-900 text-white text-xs py-1 px-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 z-10 whitespace-nowrap">
                  {h * 12} visitas
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                </div>

                {/* A Barra */}
                <div
                  className={`w-full max-w-[40px] rounded-t-lg relative transition-all duration-500 ease-out
                    ${
                      i === data.length - 1
                        ? 'bg-indigo-600 dark:bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]' // Destaque para hoje
                        : 'bg-indigo-100 dark:bg-indigo-900/40 hover:bg-indigo-400 dark:hover:bg-indigo-600'
                    }
                  `}
                  style={{ height: `${h}%` }}
                ></div>

                {/* Legenda X-Axis */}
                <span
                  className={`text-xs ${i === data.length - 1 ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`}
                >
                  {days[i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* GRID DE INFORMAÇÕES SECUNDÁRIAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CARD DE ARMAZENAMENTO */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
              <HardDrive size={20} className="text-gray-400" />
              Armazenamento e Banco
            </h3>

            <div className="space-y-6">
              {/* Item 1 */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Database size={14} /> Mídia (Imagens/Docs)
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    45GB{' '}
                    <span className="text-gray-400 font-normal">/ 100GB</span>
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all duration-1000"
                    style={{ width: '45%' }}
                  ></div>
                </div>
              </div>

              {/* Item 2 */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Server size={14} /> Banco de Dados (SQL)
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    1.2GB{' '}
                    <span className="text-gray-400 font-normal">/ 5GB</span>
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all duration-1000"
                    style={{ width: '24%' }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-800">
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <AlertCircle size={12} />O backup automático é realizado
              diariamente às 03:00.
            </p>
          </div>
        </div>

        {/* CARD DE SAÚDE DO SISTEMA */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
            <Activity size={20} className="text-gray-400" />
            Saúde e Latência
          </h3>

          <div className="grid grid-cols-2 gap-4 h-full">
            {/* KPI 1 */}
            <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-xl text-center flex flex-col justify-center items-center hover:scale-105 transition-transform">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-2">
                <Server
                  className="text-green-600 dark:text-green-400"
                  size={20}
                />
              </div>
              <div className="text-3xl font-black text-green-600 dark:text-green-400">
                99.9%
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider text-green-700 dark:text-green-300 mt-1">
                Uptime
              </div>
            </div>

            {/* KPI 2 */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl text-center flex flex-col justify-center items-center hover:scale-105 transition-transform">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-2">
                <Activity
                  className="text-blue-600 dark:text-blue-400"
                  size={20}
                />
              </div>
              <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
                120<span className="text-lg">ms</span>
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300 mt-1">
                Latência API
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
