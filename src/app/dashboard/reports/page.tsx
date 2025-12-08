import Link from 'next/link';

export default function ReportsPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <Link
          href="/dashboard"
          className="text-sm rv-text-primary hover:underline"
        >
          Voltar
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-gray-600">
          Página de relatórios ainda não implementada. Em breve teremos gráficos
          e métricas relevantes para o seu negócio.
        </p>
      </div>
    </div>
  );
}
