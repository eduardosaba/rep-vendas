import { Metadata } from 'next';
import ControlTower from '@/components/admin/ControlTower';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Limpeza de Storage | RepVendas Master',
  description: 'Área restrita para manutenção de arquivos.',
};

export default async function ClearStoragePage() {
  const supabase = await createClient();

  // 1. PROTEÇÃO MASTER: Só permite se for o seu e-mail
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const MASTER_EMAIL = 'seu-email@exemplo.com'; // Coloque seu e-mail de acesso aqui

  if (!user || user.email !== MASTER_EMAIL) {
    redirect('/dashboard'); // Redireciona usuários comuns de volta
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-10">
      <div className="max-w-5xl mx-auto">
        {/* Componente que você colocou em src/components/admin */}
        <ControlTower />
      </div>
    </div>
  );
}
