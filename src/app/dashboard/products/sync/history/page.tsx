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
import SyncLogItem from '@/components/SyncLogItem';
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
          logs.map((log) => <SyncLogItem key={log.id} log={log} />)
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
