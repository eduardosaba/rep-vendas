import { getCommissionReport } from '@/actions/commission-actions';
import { CommissionTable } from '@/components/admin/CommissionTable';
import CloseMonthButton from '@/components/admin/CloseMonthButton';

export const revalidate = 0;

type Props = {
  searchParams: { [key: string]: string | undefined };
};

export default async function ComissoesPage({ searchParams }: Props) {
  const start = typeof searchParams?.start === 'string' ? searchParams.start : undefined;
  const end = typeof searchParams?.end === 'string' ? searchParams.end : undefined;

  const res: any = await getCommissionReport(start, end);
  if (res?.error) return <div className="p-6 text-red-500">Erro: {res.error}</div>;

  const report = res.report || [];

  return (
    <div className="p-8 bg-slate-50 min-h-screen space-y-6">
      <header>
        <h1 className="text-3xl font-black italic text-slate-900">Central de Comissões</h1>
        <p className="text-slate-500">Calcule automaticamente comissões por representante e feche o mês.</p>
      </header>

      <div className="flex items-center gap-4">
        <form action="" className="flex items-center gap-2">
          <label className="text-sm">Período:</label>
          <input defaultValue={res.period?.start?.slice(0,10)} name="start" type="date" className="border rounded px-3 py-2" />
          <input defaultValue={res.period?.end?.slice(0,10)} name="end" type="date" className="border rounded px-3 py-2" />
          <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded">Filtrar</button>
        </form>
          <div className="ml-auto">
            {/* client component to trigger CSV generation */}
            <CloseMonthButton start={res.period?.start?.slice(0,10)} end={res.period?.end?.slice(0,10)} />
          </div>
      </div>

      <CommissionTable commissions={report} onUpdate={undefined} />
    </div>
  );
}
