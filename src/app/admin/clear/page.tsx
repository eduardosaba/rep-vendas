import { Metadata } from 'next';
import ControlTower from '@/components/admin/ControlTower';
import CleanupControl from '@/components/admin/CleanupControl';
import NewUserSetup from '@/components/admin/NewUserSetup';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
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
    process.env.MASTER_ADMIN_EMAIL || 'eduardopedro.fsa@gmail.com';
  const isMaster = !!user && user.email === MASTER_EMAIL;

  // Se a variável estiver configurada, a página continua e o conteúdo
  // sensível segue protegido pela checagem `isMaster` abaixo.

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-10">
      <div className="max-w-5xl mx-auto">
        {/* Exibe a Torre de Controle apenas para o master; caso contrário, mostra
            uma mensagem informativa em vez de redirecionar. */}
        {isMaster ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              <ControlTower />
              <NewUserSetup />
            </div>

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
              <Link href="/dashboard" className="inline-block">
                <Button className="px-4 py-2" variant="primary">
                  Voltar ao Dashboard
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
