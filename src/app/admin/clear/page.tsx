import { Metadata } from 'next';
import ControlTower from '@/components/admin/ControlTower';
import CleanupControl from '@/components/admin/CleanupControl';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Limpeza de Storage | RepVendas Master',
  description: 'Área restrita para manutenção de arquivos.',
};

export default async function ClearStoragePage() {
  const supabase = await createClient();

  // Tentativa de ler o usuário no server-side para mostrar mensagens úteis,
  // mas NÃO redirecionamos automaticamente: a página deve abrir quando o
  // menu for clicado. As ações críticas seguem protegidas pela API.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const MASTER_EMAIL =
    process.env.MASTER_ADMIN_EMAIL || 'seu-email@exemplo.com';
  const isMaster = !!user && user.email === MASTER_EMAIL;

  // Se a variável de ambiente não foi configurada, exibimos instruções.
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
            com seu e-mail de administrador para habilitar o acesso às operações
            sensíveis.
          </p>
          <p className="text-sm text-gray-500">Exemplo (no .env):</p>
          <pre className="mt-2 p-3 bg-gray-100 rounded text-sm">
            MASTER_ADMIN_EMAIL=seu-email@exemplo.com
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-10">
      <div className="max-w-5xl mx-auto">
        {/* Exibe a Torre de Controle apenas para o master; caso contrário, mostra
            uma mensagem informativa em vez de redirecionar. */}
        {isMaster ? (
          <>
            <ControlTower />
            <div className="mt-6">
              <h2 className="text-lg font-bold mb-2">Limpeza de Storage</h2>
              <p className="text-sm text-gray-600 dark:text-slate-300 mb-3">
                Use a verificação (dry-run) antes de executar a remoção em
                produção.
              </p>
              <CleanupControl />
            </div>
          </>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border">
            <h1 className="text-xl font-bold mb-2">Acesso Restrito</h1>
            <p className="mb-4 text-sm text-gray-600 dark:text-slate-300">
              Esta área é restrita ao usuário master. Faça login com o e-mail
              configurado em <strong>MASTER_ADMIN_EMAIL</strong> para acessar as
              operações de limpeza de storage.
            </p>
            <div className="flex gap-3">
              <a
                href="/dashboard"
                className="inline-block px-4 py-2 rounded-lg bg-primary text-white"
              >
                Voltar ao Dashboard
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
