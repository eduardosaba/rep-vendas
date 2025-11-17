"use client";

import { useState } from "react";
import { Shield, AlertTriangle, CheckCircle, Clock, X } from "lucide-react";
import { SecurityLog } from "@/lib/types";

interface SecurityLogsProps {
  logs: SecurityLog[];
  onClose: () => void;
}

export default function SecurityLogs({ logs, onClose }: SecurityLogsProps) {
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all');

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return filter === 'success' ? log.success : !log.success;
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'session_validation':
        return <Shield className="h-4 w-4" />;
      case 'order_submit':
        return <CheckCircle className="h-4 w-4" />;
      case 'session_timeout':
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string, success: boolean) => {
    if (!success) return 'text-red-600 bg-red-50';
    switch (action) {
      case 'session_validation':
        return 'text-blue-600 bg-blue-50';
      case 'order_submit':
        return 'text-green-600 bg-green-50';
      case 'session_timeout':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Logs de Segurança</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Filtros */}
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                filter === 'all'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos ({logs.length})
            </button>
            <button
              onClick={() => setFilter('success')}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                filter === 'success'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Sucesso ({logs.filter(l => l.success).length})
            </button>
            <button
              onClick={() => setFilter('error')}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                filter === 'error'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Erros ({logs.filter(l => !l.success).length})
            </button>
          </div>

          {/* Lista de logs */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum log encontrado para o filtro selecionado.</p>
              </div>
            ) : (
              filteredLogs
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-start space-x-3 p-4 rounded-lg ${getActionColor(log.action, log.success)}`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {log.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        {getActionIcon(log.action)}
                        <p className="text-sm font-medium text-gray-900">
                          {log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          log.success
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {log.success ? 'Sucesso' : 'Erro'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </p>
                      {log.details && (
                        <p className="text-sm text-gray-500 mt-1">
                          {log.details}
                        </p>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}