'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Settings,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  DollarSign,
  ShoppingCart,
  Users,
} from 'lucide-react';

// Importe seus componentes reais aqui
import { StatCard } from '@/components/StatCard';
import { SalesBarChart } from '@/components/dashboard/SalesBarChart';
import RecentOrdersTable from '@/components/RecentOrdersTable';

// --- MOCK DATA (Dados Falsos para Demo) ---
const MOCK_TOTALS = {
  revenue: 15420.5,
  orders: 45,
  items: 128,
  products: 64,
};

const MOCK_CHART_DATA = [
  { name: 'Jan', vendas: 2400 },
  { name: 'Fev', vendas: 1398 },
  { name: 'Mar', vendas: 9800 },
  { name: 'Abr', vendas: 3908 },
  { name: 'Mai', vendas: 4800 },
  { name: 'Jun', vendas: 15420 },
];

const MOCK_ORDERS = [
  {
    id: '1',
    display_id: 1024,
    client_name_guest: 'Mercadinho Central',
    total_value: 1250.0,
    status: 'pending',
    created_at: new Date().toISOString(),
    item_count: 12,
    pdf_url: '#',
  },
  {
    id: '2',
    display_id: 1023,
    client_name_guest: 'Padaria do João',
    total_value: 450.5,
    status: 'confirmed',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    item_count: 5,
    pdf_url: '#',
  },
  {
    id: '3',
    display_id: 1022,
    client_name_guest: 'Super Compras',
    total_value: 2890.0,
    status: 'delivered',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    item_count: 34,
    pdf_url: '#',
  },
  {
    id: '4',
    display_id: 1021,
    client_name_guest: 'Loja da Esquina',
    total_value: 120.0,
    status: 'cancelled',
    created_at: new Date(Date.now() - 259200000).toISOString(),
    item_count: 2,
    pdf_url: '#',
  },
  {
    id: '5',
    display_id: 1020,
    client_name_guest: 'Restaurante Sabor',
    total_value: 890.0,
    status: 'delivered',
    created_at: new Date(Date.now() - 345600000).toISOString(),
    item_count: 8,
    pdf_url: '#',
  },
];

export default function DashboardDemo() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
      {/* --- SIDEBAR REPLICA --- */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0d1b2c] text-white transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-700">
          <span className="text-xl font-bold tracking-tight">Rep-Vendas</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          <NavItem icon={LayoutDashboard} label="Visão Geral" active />
          <NavItem icon={ShoppingBag} label="Pedidos" />
          <NavItem icon={Package} label="Produtos" />
          <NavItem icon={Users} label="Clientes" />
          <NavItem icon={Settings} label="Configurações" />
        </nav>

        <div className="border-t border-gray-700 p-4">
          <Link
            href="/register"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-gray-800 hover:text-red-300 transition-colors"
          >
            <LogOut size={20} />
            Sair da Demo
          </Link>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-gray-500 hover:text-gray-700"
          >
            <Menu size={24} />
          </button>

          <div className="flex-1 flex justify-center md:justify-start md:ml-4">
            {/* Aviso de Demo */}
            <div className="bg-amber-100 text-amber-800 px-4 py-1 rounded-full text-xs font-bold border border-amber-200 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
              MODO DEMONSTRAÇÃO
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="text-gray-400 hover:text-gray-600 relative">
              <Bell size={20} />
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>
            <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center text-primary font-bold border border-primary/20">
              U
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Olá, Visitante 👋
              </h1>
              <p className="text-sm text-gray-500">
                Este é um exemplo real de como será sua gestão.
              </p>
            </div>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-lg bg-[#b9722e] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#a06025] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all"
            >
              Criar Conta Grátis
            </Link>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatCard
              title="Receita Total"
              value={new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(MOCK_TOTALS.revenue)}
              icon={DollarSign}
              color="green"
            />
            <StatCard
              title="Pedidos"
              value={MOCK_TOTALS.orders}
              icon={ShoppingBag}
              color="blue"
            />
            <StatCard
              title="Itens Vendidos"
              value={MOCK_TOTALS.items}
              icon={ShoppingCart}
              color="purple"
            />
            <StatCard
              title="Produtos Ativos"
              value={MOCK_TOTALS.products}
              icon={Package}
              color="orange"
            />
          </div>

          {/* Chart & Actions */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-8">
            <div className="lg:col-span-2 min-h-[350px]">
              <SalesBarChart data={MOCK_CHART_DATA} />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 flex flex-col justify-center gap-4">
              <h3 className="font-semibold text-gray-900">
                Ações Rápidas (Demo)
              </h3>
              <button
                disabled
                className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-400 cursor-not-allowed"
              >
                + Novo Produto
              </button>
              <button
                disabled
                className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-400 cursor-not-allowed"
              >
                Importar Planilha
              </button>
              <Link
                href="/demo/catalogo"
                target="_blank"
                className="w-full text-left px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 font-medium transition-colors"
              >
                Ver Loja Online ↗
              </Link>
            </div>
          </div>

          {/* Table */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Últimos Pedidos
            </h3>
            <RecentOrdersTable orders={MOCK_ORDERS} />
          </div>
        </div>
      </main>
    </div>
  );
}

// Componente Auxiliar de Navegação da Sidebar
function NavItem({
  icon: Icon,
  label,
  active = false,
}: {
  icon: React.ComponentType<any>;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${active ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white cursor-pointer'}`}
    >
      <Icon
        size={20}
        className={`${active ? 'text-[#b9722e]' : 'text-gray-400 group-hover:text-white'}`}
      />
      {label}
    </div>
  );
}
