import React from 'react';
import { JobHistoryClient } from './components/JobHistoryClient';

export const metadata = {
  title: 'Histórico & Auditoria de Produtos | RepVendas Admin',
  description: 'Consulte o histórico de importações de produtos, veja alterações detalhadas e execute rollback auditado.',
};

export default function JobHistoryPage() {
  return <JobHistoryClient />;
}
