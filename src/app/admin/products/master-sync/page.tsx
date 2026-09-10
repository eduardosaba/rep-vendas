import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Atualização Inteligente da Torre de Controle | RepVendas',
  description: 'Motor de Atualização de Produtos Global Server-Side para Administradores e Master.',
};

export default function MasterSyncPage() {
  redirect('/admin/produtos/atualizacao-inteligente?mode=global');
}