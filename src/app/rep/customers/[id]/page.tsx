import CustomerFile from '@/components/rep/CustomerFile';
import { getCustomerDetails } from '../actions';

interface Props {
  params: { id: string };
}

export default async function Page({ params }: Props) {
  const res = await getCustomerDetails(params.id);
  if (!res.success) {
    return <div className="p-6">Erro: {String(res.error)}</div>;
  }

  return <CustomerFile customer={res.data} />;
}
