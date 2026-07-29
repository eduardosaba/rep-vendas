import React from 'react';
import { ExecutiveDashboardClient } from './components/ExecutiveDashboardClient';

export const metadata = {
  title: 'Dashboard Executivo de Produtos | RepVendas Admin',
  description: 'Visão panorâmica em tempo real sobre a saúde do catálogo de produtos, estoque, preços e histórico de alterações.',
};

export default function ExecutiveDashboardPage() {
  return <ExecutiveDashboardClient />;
}
