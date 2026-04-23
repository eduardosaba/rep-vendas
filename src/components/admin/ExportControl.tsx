
'use client'

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { exportTableToExcel } from '@/app/actions/export';
import { useToast } from '@/hooks';

export default function ExportControl() {
  const { addToast } = useToast();
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'date'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Map of technical column names to friendly labels
  const COLUMN_MAP: Record<string, string> = {
    name: 'Nome',
    created_at: 'Data de Cadastro',
    price: 'Preço de Venda',
    stock_quantity: 'Estoque Atual',
    sku: 'Código/SKU',
    phone: 'WhatsApp',
    status: 'Situação',
    id: 'ID',
  };

  useEffect(() => {
    async function fetchColumns() {
      if (!tableName) return;
      const supabase = createClient();
      try {
        const { data, error } = await supabase.rpc('get_table_columns', { t_name: tableName });
        if (error) throw error;
        setColumns((data || []).map((c: any) => c.column_name));
      } catch (err) {
        console.error('Erro ao buscar colunas', err);
        setColumns([]);
      }
    }
    fetchColumns();
  }, [tableName]);

  const toggleField = (field: string) => {
    setSelectedFields(prev => (prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]));
  };

  const handleExport = async () => {
    // Segurança: evitar exportar muitos campos sem filtro de data
    if (filterType === 'all' && selectedFields.length > 15) {
      addToast?.({ title: 'Seleção muito grande', description: 'Para exportar todas as colunas, por favor, selecione um período de datas para evitar lentidão.', type: 'error' });
      return;
    }

    setExporting(true);
    try {
      const dateParams = filterType === 'date' ? { start: startDate, end: endDate } : undefined;
      const base64 = await exportTableToExcel(tableName, selectedFields, dateParams as any, COLUMN_MAP);

      const link = document.createElement('a');
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
      link.download = `${tableName}_${filterType === 'all' ? 'total' : 'periodo'}.xlsx`;
      link.click();
    } catch (err) {
      console.error('Erro ao exportar:', err);
      const message = (err as any)?.message || String(err);
      addToast?.({ title: 'Falha ao exportar', description: message, type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white shadow rounded-xl space-y-6">
      <h2 className="text-xl font-bold border-b pb-2">Exportador Master</h2>

      <div>
        <label className="block text-sm font-medium mb-1">Tabela de Origem</label>
        <select className="w-full p-2 border rounded" onChange={(e) => { setTableName(e.target.value); setSelectedFields([]); }}>
          <option value="">Selecione...</option>
          <option value="pedidos">Pedidos</option>
          <option value="clientes">Clientes</option>
          <option value="products">Produtos</option>
        </select>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm font-bold mb-3">Abrangência dos Dados:</p>
        <div className="flex gap-4 mb-3">
          <label className="flex items-center gap-2">
            <input type="radio" checked={filterType === 'all'} onChange={() => setFilterType('all')} />
            <span className="ml-2">Exportar Tudo</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={filterType === 'date'} onChange={() => setFilterType('date')} />
            <span className="ml-2">Filtrar por Data</span>
          </label>
        </div>

        {filterType === 'date' && (
          <div className="flex gap-2">
            <input type="date" className="p-2 border rounded" onChange={(e) => setStartDate(e.target.value)} />
            <input type="date" className="p-2 border rounded" onChange={(e) => setEndDate(e.target.value)} />
          </div>
        )}
      </div>

      {columns.length > 0 && (
        <div className="border p-4 rounded-lg">
          <div className="flex justify-between mb-2">
            <p className="text-sm font-bold">Campos do Relatório:</p>
            <button className="text-xs text-blue-600 underline" onClick={() => setSelectedFields(columns)}>Selecionar Todos</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {columns.map(col => (
              <label key={col} className="flex items-center gap-2 text-xs truncate">
                <input type="checkbox" checked={selectedFields.includes(col)} onChange={() => toggleField(col)} />
                <span>{col}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <button onClick={handleExport} disabled={exporting || loading || !tableName || selectedFields.length === 0} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300">
        {exporting ? 'Processando...' : 'Gerar Relatório XLSX'}
      </button>
    </div>
  );
}
