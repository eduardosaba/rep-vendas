import { Metadata } from 'next';
import ControlTower from '@/components/admin/ControlTower';
import CleanupControl from '@/components/admin/CleanupControl';
import NewUserSetup from '@/components/admin/NewUserSetup';
import ReprocessImagesControl from '@/components/admin/ReprocessImagesControl';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Limpeza de Storage | RepVendas Master',
  description: 'Área restrita para manutenção de arquivos.',
};

export default async function ClearStoragePage() {
  const supabase = await createClient();

  // 1. Verificação de Usuário Master
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const MASTER_EMAIL =
    process.env.MASTER_ADMIN_EMAIL || 'eduardopedro.fsa@gmail.com';
  const isMaster = !!user && user.email === MASTER_EMAIL;

  // 2. Lógica de busca de falhas de sincronização (Preservada)
  let failedCount = 0;
  try {
    const cnt = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('sync_status', 'failed');
    failedCount = (cnt as any).count || 0;
  } catch (e) {
    console.error('Erro ao buscar falhas:', e);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      {/* Ajustado para max-w-screen-2xl para maior largura útil */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {isMaster ? (
          <div className="flex flex-col gap-8 mt-8">
            {/* SEÇÃO A: TORRE DE CONTROLE (Largura Total para não truncar tabelas) */}
            <section className="w-full">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <ControlTower />
              </div>
            </section>

            {/* SEÇÃO B: SETUP DE NOVO CLIENTE */}
            <section className="w-full">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-xl font-bold tracking-tight">
                    Setup de Novo Cliente
                  </h2>
                  <p className="text-sm text-slate-500">
                    Provisionamento de novos usuários e clonagem de funções.
                  </p>
                </div>
                <NewUserSetup />
              </div>
            </section>

            {/* SEÇÃO C: MANUTENÇÃO E STORAGE (Lado a lado em telas XL) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
              {/* Painel de Limpeza */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-xl font-bold tracking-tight">
                    Limpeza de Storage
                  </h2>
                  <p className="text-sm text-slate-500">
                    Remoção de arquivos órfãos no Supabase.
                  </p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-800 p-4 rounded-2xl mb-6">
                  <p className="text-xs text-amber-800 dark:text-amber-400">
                    <strong>Atenção:</strong> Use a verificação (dry-run) antes
                    de executar a remoção em produção.
                  </p>
                </div>
                <CleanupControl />
              </div>

              {/* Painel de Reprocessamento */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-xl font-bold tracking-tight">
                    Saúde das Imagens
                  </h2>
                  <p className="text-sm text-slate-500">
                    Reprocessar falhas de sincronização detectadas.
                  </p>
                </div>
                <ReprocessImagesControl initialCount={failedCount} />
              </div>
            </div>
          </div>
        ) : (
          /* MENSAGEM DE ACESSO RESTRITO */
          <div className="max-w-md mx-auto bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl mt-20 text-center">
            <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
            <p className="mb-6 text-sm text-gray-600 dark:text-slate-400">
              Esta área é restrita ao usuário master. Por favor, utilize o
              e-mail: <br />
              <span className="font-mono font-bold text-primary">
                {MASTER_EMAIL}
              </span>
            </p>
            <Link href="/dashboard">
              <Button className="w-full" variant="primary">
                Voltar ao Dashboard
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
