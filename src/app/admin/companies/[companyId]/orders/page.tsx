import CompanyOrdersDashboard from '@/components/dashboard/CompanyOrders';
import { getCompanyOrders } from '../../actions';

interface Props {
  params: { companyId: string };
}

export default async function Page({ params }: Props) {
  const res = await getCompanyOrders(params.companyId);
  const orders = res.success ? res.data : [];

  return (
    <div className="p-6">
      <CompanyOrdersDashboard orders={orders} />
    </div>
  );
}
