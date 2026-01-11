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
  // Leia o e-mail master de variável de ambiente para não deixar um valor
  // hardcoded no código. Defina a variável `MASTER_ADMIN_EMAIL` no ambiente.
  const MASTER_EMAIL =
    process.env.MASTER_ADMIN_EMAIL || 'seu-email@exemplo.com';

  if (!user) {
    // Usuário não autenticado: redireciona para dashboard (login controlado em outro lugar)
    redirect('/dashboard');
  }

  // Se a variável de ambiente não foi configurada, exibimos uma página de
  // instrução para o administrador em vez de redirecionar silenciosamente.
  if (MASTER_EMAIL === 'seu-email@exemplo.com') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-10">
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-lg p-6 border">
          <h1 className="text-xl font-bold mb-2">
            Acesso à Limpeza de Storage
          </h1>
          <p className="mb-4 text-sm text-gray-600 dark:text-slate-300">
            A rota de limpeza de storage está protegida por e-mail master.
            Configure a variável de ambiente <strong>MASTER_ADMIN_EMAIL</strong>{' '}
            com seu e-mail de administrador para habilitar o acesso.
          </p>
          <p className="text-sm text-gray-500">Exemplo (no .env):</p>
          <pre className="mt-2 p-3 bg-gray-100 rounded text-sm">
            MASTER_ADMIN_EMAIL=seu-email@exemplo.com
          </pre>
        </div>
      </div>
    );
  }

  if (user.email !== MASTER_EMAIL) {
    // Usuário autenticado, mas não é o master — negar acesso
    redirect('/dashboard');
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
