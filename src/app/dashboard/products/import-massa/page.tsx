'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/useToast';
import * as XLSX from 'xlsx'; // Importa a biblioteca que instalamos
import Link from 'next/link';
import {
  ArrowLeft,
  FileSpreadsheet,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';

// Define a estrutura esperada do Excel
interface ExcelRow {
  Nome: string;
  Referencia: string;
  Preco: number | string;
  Marca?: string;
  Descricao?: string;
}

export default function ImportMassaPage() {
  const { addToast } = useToast();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [stats, setStats] = useState({ total: 0, success: 0, errors: 0 });

  // 1. Ler o ficheiro Excel
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    // Processar o Excel
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });

      // Pega a primeira aba da planilha
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];

      // Converte para JSON
      const data = XLSX.utils.sheet_to_json(ws);
      setPreviewData(data as any[]);
      setStep(2); // Avança para preview
    };
    reader.readAsBinaryString(selectedFile);
  };

  // 2. Enviar para o Supabase
  const handleImport = async () => {
    setImporting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não logado');

      // Prepara os dados para o formato do banco
      const productsToInsert = previewData
        .map((row: any) => {
          // Tenta encontrar as colunas independente de maiúsculas/minúsculas
          const name = row['Nome'] || row['nome'] || row['Name'];
          const ref =
            row['Referencia'] || row['referencia'] || row['sku'] || row['SKU'];
          const priceRaw = row['Preco'] || row['preco'] || row['Price'] || '0';
          const brand = row['Marca'] || row['marca'] || row['Brand'];

          // Limpeza básica de preço (troca vírgula por ponto)
          let price = 0;
          if (typeof priceRaw === 'string') {
            price = parseFloat(
              priceRaw.replace('R$', '').replace(',', '.').trim()
            );
          } else {
            price = Number(priceRaw);
          }

          // Se não tiver referência, gera uma provisória
          const finalRef = ref
            ? String(ref)
            : `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

          if (!name) return null; // Pula linhas vazias

          return {
            user_id: user.id,
            name: String(name),
            reference_code: finalRef,
            price: isNaN(price) ? 0 : price,
            brand: brand ? String(brand) : null,
            // image_url: null (As imagens serão vinculadas depois no Matcher)
          };
        })
        .filter(Boolean); // Remove nulos

      // Envia em lotes de 50 para não sobrecarregar
      const batchSize = 50;
      for (let i = 0; i < productsToInsert.length; i += batchSize) {
        const batch = productsToInsert.slice(i, i + batchSize);

        // Upsert: Se a referência já existir, atualiza os dados (ideal para correção de preços)
        const { error } = await supabase
          .from('products')
          .upsert(batch, { onConflict: 'user_id,reference_code' });

        if (error) {
          console.error('Erro no lote', error);
          errorCount += batch.length;
        } else {
          successCount += batch.length;
        }
      }

      setStats({
        total: productsToInsert.length,
        success: successCount,
        errors: errorCount,
      });
      setStep(3); // Sucesso
      addToast({ title: 'Importação concluída!', type: 'success' });
    } catch (error: any) {
      console.error(error);
      addToast({
        title: 'Erro fatal na importação',
        description: error.message,
        type: 'error',
      });
    } finally {
      setImporting(false);
    }
  };

  // Template para download
  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        Nome: 'Tênis Exemplo',
        Referencia: 'REF001',
        Preco: '199,90',
        Marca: 'Nike',
      },
      {
        Nome: 'Camiseta Básica',
        Referencia: 'REF002',
        Preco: 49.9,
        Marca: 'Adidas',
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    XLSX.writeFile(wb, 'modelo_importacao.xlsx');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/products"
          className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Importação em Massa
          </h1>
          <p className="text-sm text-gray-500">
            Carregue seus produtos via Excel ou CSV
          </p>
        </div>
      </div>

      {/* Passo 1: Upload */}
      {step === 1 && (
        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
            <FileSpreadsheet size={32} />
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Carregue sua planilha
          </h3>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            O arquivo deve conter as colunas:{' '}
            <strong>Nome, Referencia, Preco e Marca</strong>.
          </p>

          <div className="flex flex-col gap-4 max-w-sm mx-auto">
            <label className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium cursor-pointer hover:bg-indigo-700 transition-colors shadow-sm">
              <Upload size={20} />
              Escolher Ficheiro Excel
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            <button
              onClick={downloadTemplate}
              className="text-sm text-indigo-600 hover:text-indigo-800 underline"
            >
              Baixar modelo de exemplo
            </button>
          </div>
        </div>
      )}

      {/* Passo 2: Preview */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                Pré-visualização ({previewData.length} itens encontrados)
              </h3>
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-70"
              >
                {importing ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <CheckCircle size={20} />
                )}
                Confirmar Importação
              </button>
            </div>

            <div className="overflow-x-auto border rounded-lg max-h-96">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-medium sticky top-0">
                  <tr>
                    <th className="px-4 py-3">Referência</th>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Preço</th>
                    <th className="px-4 py-3">Marca</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {previewData.slice(0, 50).map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs">
                        {row['Referencia'] || row['sku'] || '-'}
                      </td>
                      <td className="px-4 py-2 font-medium">
                        {row['Nome'] || row['nome'] || 'Sem Nome'}
                      </td>
                      <td className="px-4 py-2">
                        {row['Preco'] || row['preco'] || '0'}
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        {row['Marca'] || row['marca'] || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewData.length > 50 && (
                <p className="p-4 text-center text-xs text-gray-500 bg-gray-50">
                  ... e mais {previewData.length - 50} itens.
                </p>
              )}
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3 text-blue-800 text-sm">
            <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
            <p>
              <strong>Nota:</strong> Se uma referência já existir no sistema, os
              dados (preço/nome) serão atualizados. Isso é útil para atualização
              de preços em massa.
            </p>
          </div>
        </div>
      )}

      {/* Passo 3: Conclusão */}
      {step === 3 && (
        <div className="bg-white p-12 rounded-xl border border-gray-200 shadow-sm text-center">
          <div className="mx-auto w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-300">
            <CheckCircle size={40} />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Importação Realizada!
          </h2>
          <p className="text-gray-500 mb-8">
            Processamos o seu ficheiro com sucesso.
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-8 text-sm">
            <div className="bg-gray-50 p-3 rounded-lg">
              <span className="block text-gray-500">Sucessos</span>
              <span className="block text-xl font-bold text-green-600">
                {stats.success}
              </span>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <span className="block text-gray-500">Erros</span>
              <span className="block text-xl font-bold text-red-600">
                {stats.errors}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard/products"
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
            >
              Ver Catálogo
            </Link>

            {/* O Próximo passo lógico: O Matcher! */}
            <Link
              href="/dashboard/products/matcher"
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex items-center justify-center gap-2"
            >
              Vincular Fotos (Matcher)
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
