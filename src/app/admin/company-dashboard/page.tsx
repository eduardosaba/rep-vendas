import CompanyDashboard from '@/components/admin/CompanyDashboard';
import { getCompanyStats } from '../dashboard/actions';

export default async function Page() {
  const res = await getCompanyStats();
  const stats = res.success ? res.data : { totalSales: 0, orderCount: 0, activeCustomers: 0, ranking: [], pendingBilling: 0 };

  return <CompanyDashboard stats={stats} />;
}
