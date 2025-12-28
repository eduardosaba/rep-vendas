import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  History,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  FileText,
  Zap,
  Search,
  ChevronRight,
  DollarSign,
  Package,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

// Mapeamento visual das ferramentas para a auditoria
const TOOL_CONFIG: Record<string, { label: string; icon: any; color: string }> =
  {
    price: {
      label: 'Sincronização de Preços (PROCV)',
      icon: Zap,
      color: 'text-blue-600 bg-blue-50',
    },
    stock_quantity: {
      label: 'Sincronização de Estoque (PROCV)',
      icon: Package,
      color: 'text-orange-600 bg-orange-50',
    },
    update_prices: {
      label: 'Ajuste Financeiro Manual',
      icon: DollarSign,
      color: 'text-emerald-600 bg-emerald-50',
    },
    default: {
      label: 'Operação de Dados',
      icon: FileText,
      color: 'text-gray-600 bg-gray-50',
    },
  };

export default async function SyncHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: logs } = await supabase
    .from('sync_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen animate-in fade-in duration-500">
      <header className="mb-8">
        <Link
          href="/dashboard/products/sync"
          className="flex items-center gap-2 text-xs font-black uppercase text-gray-400 hover:text-primary transition-colors mb-2"
        >
          <ArrowLeft size={14} /> Voltar
        </Link>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <History className="text-primary" size={32} /> Saúde dos Dados
        </h1>
        <p className="text-slate-500 font-medium italic">
          Trilha de auditoria oficial da sua operação.
        </p>
      </header>

      <div className="space-y-4">
        {logs && logs.length > 0 ? (
          logs.map((log) => {
            const config =
              TOOL_CONFIG[log.target_column] || TOOL_CONFIG['default'];
            const Icon = config.icon;
            const successRate =
              log.total_processed > 0
                ? Math.round((log.updated_count / log.total_processed) * 100)
                : 0;

            return (
              <div
                key={log.id}
                className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all"
              >
                <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Info da Ferramenta */}
                  <div className="flex items-start gap-5">
                    <div
                      className={`p-4 rounded-2xl shadow-sm ${config.color}`}
                    >
                      <Icon size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          {format(
                            new Date(log.created_at),
                            "dd 'de' MMMM 'às' HH:mm",
                            { locale: ptBR }
                          )}
                        </span>
                        {successRate < 100 && (
                          <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-[9px] font-black uppercase">
                            Divergência
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-800 text-lg leading-tight">
                        {config.label}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 truncate max-w-[200px]">
                        Arquivo: {log.filename}
                      </p>
                    </div>
                  </div>

                  {/* Resumo Numérico */}
                  <div className="grid grid-cols-3 gap-8 border-l border-gray-100 pl-8">
                    <div>
                      <p className="text-[9px] font-black uppercase text-gray-400">
                        Linhas
                      </p>
                      <p className="text-lg font-black text-slate-700">
                        {log.total_processed}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-gray-400">
                        Sucesso
                      </p>
                      <p className="text-lg font-black text-emerald-500">
                        {log.updated_count}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-gray-400">
                        Falhas
                      </p>
                      <p
                        className={`text-lg font-black ${log.mismatch_count > 0 ? 'text-red-500' : 'text-slate-200'}`}
                      >
                        {log.mismatch_count}
                      </p>
                    </div>
                  </div>

                  {/* Detalhes SKU */}
                  <div className="flex items-center">
                    <button className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors flex items-center gap-2">
                      Detalhes <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                {/* Lista de SKUs não encontrados */}
                {log.mismatch_count > 0 && (
                  <div className="bg-slate-50 border-t border-gray-100 p-6">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 mb-3">
                      <Search size={14} /> Referências não encontradas no
                      sistema
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(log.mismatch_list as any[])
                        ?.slice(0, 10)
                        .map((m: any, idx: number) => (
                          <div
                            key={idx}
                            className="bg-white border border-gray-200 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm"
                          >
                            {m.key}
                          </div>
                        ))}
                      {log.mismatch_count > 10 && (
                        <span className="text-xs text-slate-400 font-bold self-center ml-2">
                          + {log.mismatch_count - 10} itens
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
            <div className="opacity-20 flex justify-center mb-4">
              <History size={64} />
            </div>
            <p className="font-bold text-slate-400 uppercase text-xs tracking-widest">
              Nenhuma atividade registrada
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
