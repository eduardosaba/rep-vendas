'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Trash2, AlertTriangle, Loader2, ShieldAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface AdminUserResetProps {
  targetUserId: string;
  targetUserEmail: string;
  onSuccess?: () => void;
}

export function AdminUserReset({ targetUserId, targetUserEmail, onSuccess }: AdminUserResetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handleReset = async () => {
    if (confirmText !== 'DELETAR') return;

    setIsLoading(true);
    try {
      // Chama a função RPC segura no banco de dados
      const { error } = await supabase.rpc('admin_reset_user_data', {
        target_user_id: targetUserId,
      });

      if (error) throw error;

      toast.success(`Dados de ${targetUserEmail} resetados com sucesso.`);
      setIsOpen(false);
      setConfirmText('');
      
      // Atualiza a lista pai, se a função for passada
      if (onSuccess) onSuccess();
      
    } catch (error: any) {
      // Log detalhado para evitar o erro vazio "{}"
      console.error('Erro RPC detalhado:', error);
      
      const errorMessage = error.message || error.details || 'Erro desconhecido ao resetar dados.';
      
      toast.error('Falha na operação', { 
        description: errorMessage.includes('permission') 
          ? 'Permissão negada. Verifique se seu usuário é "is_admin=true" no banco.' 
          : errorMessage 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Botão Gatilho (Lixeira) */}
      <button 
        onClick={() => setIsOpen(true)}
        className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        title="Resetar Dados do Usuário"
      >
        <Trash2 size={18} />
      </button>

      {/* Modal de Segurança */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border-2 border-red-500 rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden">
            
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>

            {/* Ícone de Fundo Decorativo */}
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <ShieldAlert size={150} className="text-red-500" />
            </div>

            <div className="relative z-10 text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-600">
                <AlertTriangle size={32} />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Zona de Perigo
              </h3>

              <div className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                Você vai apagar <strong>TODOS</strong> os produtos, clientes e pedidos de:
                <div className="mt-2 bg-gray-100 dark:bg-slate-800 p-2 rounded font-mono font-bold select-all break-all text-gray-900 dark:text-white">
                  {targetUserEmail}
                </div>
              </div>

              <div className="text-left bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30 mb-6">
                <label className="block text-xs font-bold text-red-800 dark:text-red-400 uppercase mb-2">
                  Confirmação de Segurança
                </label>
                <p className="text-xs text-red-600/80 dark:text-red-400/80 mb-2">
                  Digite <strong>DELETAR</strong> para confirmar.
                </p>
                <input
                  type="text"
                  value={confirmText}
                  // FORÇA MAIÚSCULO NO ESTADO PARA VALIDAR CORRETAMENTE
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  className="w-full p-2 border-2 border-red-200 dark:border-red-900 rounded-lg focus:border-red-500 focus:ring-red-500 outline-none font-bold text-center uppercase bg-white dark:bg-slate-950 dark:text-white placeholder-red-200 dark:placeholder-red-900/50"
                  placeholder="DELETAR"
                  autoComplete="off"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                
                <Button
                  variant="danger"
                  onClick={handleReset}
                  // Validação estrita
                  disabled={confirmText !== 'DELETAR' || isLoading}
                  isLoading={isLoading}
                  className="flex-1 shadow-lg shadow-red-500/20"
                  leftIcon={<Trash2 size={18} />}
                >
                  Confirmar Reset
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}