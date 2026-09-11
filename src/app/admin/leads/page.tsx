import { getAdminLeadsAction } from './actions';
import LeadsClient from './LeadsClient';

export const dynamic = 'force-dynamic';

export default async function AdminLeadsPage() {
  const result = await getAdminLeadsAction({ page: 1, pageSize: 20 });

  return (
    <LeadsClient
      initialLeads={result.leads || []}
      initialTotal={result.total || 0}
      initialPage={result.page || 1}
      initialPageSize={result.pageSize || 20}
      initialTotalPages={result.totalPages || 1}
      initialMetrics={
        result.metrics || {
          total: 0,
          newLeads: 0,
          inContact: 0,
          converted: 0,
          handledCount: 0,
        }
      }
    />
  );
}
