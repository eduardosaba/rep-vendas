import React, { useEffect, useState } from 'react';

export default function BlockedAccountPopup({ onClose }: { onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative max-w-md w-full bg-white rounded-lg p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Ativação necessária</h3>
        <p className="text-sm text-gray-700 mb-4">Sua conta precisa ser ativada para o funcionamento completo do catálogo e pedidos. Acesse a página de cobrança para ativar.</p>
        <div className="flex gap-2 justify-end">
          <a href="/dashboard/billing" className="px-4 py-2 rounded bg-[var(--primary)] text-white">Ir para Cobrança</a>
          <button onClick={() => onClose && onClose()} className="px-4 py-2 rounded bg-gray-200">Fechar</button>
        </div>
      </div>
    </div>
  );
}
