import Link from 'next/link';
import { BarChart3, Palette, ShoppingBag, Users } from 'lucide-react';

const cards = [
  {
    title: 'Gestão Comercial',
    description: 'Central de pedidos, comissões e indicadores de conversão da equipe.',
    href: '/dashboard/orders',
    icon: ShoppingBag,
  },
  {
    title: 'Gestão de Equipe',
    description: 'Controle de representantes, permissões e links personalizados.',
    href: '/dashboard/admin/equipe',
    icon: Users,
  },
  {
    title: 'Customização do Catálogo',
    description: 'Cores, branding, páginas institucionais e seções dinâmicas da home.',
    href: '/dashboard/admin/configuracoes',
    icon: Palette,
  },
  {
    title: 'Relatórios B2B',
    description: 'Visão consolidada de performance para decisões de campanha e mix.',
    href: '/dashboard/reports',
    icon: BarChart3,
  },
];

export default function AdminCompanyHomePage() {
  return (
    <div className="space-y-8">
      <header className="bg-white border border-slate-100 rounded-[2rem] p-8">
        <p className="text-xs font-black uppercase text-slate-400 tracking-wider">Central de Comando</p>
        <h1 className="text-3xl font-black italic text-slate-900 mt-2">Dashboard da Distribuidora</h1>
        <p className="text-slate-500 mt-2 max-w-2xl">
          Gerencie catálogo, time comercial e identidade da marca em um único lugar.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {cards.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              href={item.href}
              className="group bg-white border border-slate-100 rounded-[2rem] p-6 hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <Icon size={20} />
              </div>
              <h2 className="mt-4 text-xl font-black text-slate-900">{item.title}</h2>
              <p className="text-sm text-slate-500 mt-2">{item.description}</p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}

