import React from 'react';
import { PriceManagementClient } from './components/PriceManagementClient';

export const metadata = {
  title: 'Gestão Especialista de Preço | RepVendas Admin',
  description: 'Execute estratégias de remarcação, aumentos em massa, descontos por coleção e arredondamento comercial.',
};

export default function PriceManagementPage() {
  return <PriceManagementClient />;
}
