'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
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
  // usar sonner programático
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<{
    name?: string;
    ref?: string;
    price?: string;
    brand?: string;
    desc?: string;
  }>({});
  // Helper: pega valor da coluna mapeada com fallback (disponível para preview e import)
  const getField = (row: any, key?: string) => {
    if (!row || !key) return undefined;
    if (row[key] !== undefined) return row[key];
    // tentar case-insensitive
    const foundKey = Object.keys(row).find(
      (k) => k.toLowerCase() === key.toLowerCase()
    );
    if (foundKey) return row[foundKey];
    return undefined;
  };
  const [importing, setImporting] = useState(false);
  const [stats, setStats] = useState({ total: 0, success: 0, errors: 0 });
  const supabase = createClient();

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
      const rows = data as any[];
      setPreviewData(rows);

      // Detect columns (keys) from the first row(s)
      const detected = new Set<string>();
      for (let i = 0; i < Math.min(rows.length, 5); i++) {
        const r = rows[i] || {};
        Object.keys(r).forEach((k) => detected.add(String(k)));
      }
      const cols = Array.from(detected);
      setColumns(cols);

      // Heurísticas para mapear automaticamente algumas colunas
      const detect = (candidates: string[]) =>
        cols.find((c) =>
          candidates.map((s) => s.toLowerCase()).includes(c.toLowerCase())
        );

      const defaultRef = detect([
        'Ref',
        'Referencia',
        'referencia',
        'REF',
        'reference',
        'sku',
      ]);
      const defaultPrice = detect([
        'valor',
        'Valor',
        'Preco',
        'Preco',
        'preco',
        'Price',
        'price',
      ]);
      const defaultName = detect(['Nome', 'nome', 'Name', 'name']);
      const defaultBrand = detect(['Marca', 'marca', 'Brand', 'brand']);
      const defaultDesc = detect([
        'Descricao',
        'Descrição',
        'descricao',
        'Description',
        'description',
      ]);

      setMapping({
        name: defaultName,
        ref: defaultRef,
        price: defaultPrice,
        brand: defaultBrand,
        desc: defaultDesc,
      });

      setStep(2); // Avança para preview/mapeamento
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

      // Prepara os dados para o formato do banco usando os mapeamentos escolhidos
      const productsToInsert = previewData
        .map((row: any) => {
          const name =
            getField(row, mapping.name) ||
            getField(row, 'Nome') ||
            getField(row, 'name');
          const ref =
            getField(row, mapping.ref) ||
            getField(row, 'Referencia') ||
            getField(row, 'Ref') ||
            getField(row, 'sku');
          const priceRaw =
            getField(row, mapping.price) ||
            getField(row, 'Preco') ||
            getField(row, 'valor') ||
            getField(row, 'price') ||
            '0';
          const brand = getField(row, mapping.brand) || getField(row, 'Marca');

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

          const slugify = (s: string) =>
            s
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-');

          const slugBase = slugify(String(name) || 'produto');

          return {
            user_id: user.id,
            name: String(name),
            reference_code: finalRef,
            price: isNaN(price) ? 0 : price,
            brand: brand ? String(brand) : null,
            slug: `${slugBase}-${Date.now().toString(36).slice(-6)}`,
          };
        })
        .filter(Boolean);

      // Envia em lotes de 50 para não sobrecarregar
      const batchSize = 50;
      for (let i = 0; i < productsToInsert.length; i += batchSize) {
        const batch = productsToInsert.slice(i, i + batchSize);

        // Tentativa de upsert com fallbacks porque o ON CONFLICT exige constraint única existente.
        // 1) Tenta composite (user_id,reference_code)
        // 2) Se falhar com 42P10 (constraint inexistente), tenta apenas reference_code
        // 3) Se ainda falhar, faz insert simples como fallback
        let res: any;
        try {
          res = await supabase
            .from('products')
            .upsert(batch, { onConflict: 'user_id,reference_code' });
        } catch (e: any) {
          // Alguns clientes retornam via throw; normalizar para objeto com error
          res = { error: e };
        }

        if (res?.error && String(res.error?.code) === '42P10') {
          // tenta somente reference_code
          try {
            res = await supabase
              .from('products')
              .upsert(batch, { onConflict: 'reference_code' });
          } catch (e: any) {
            res = { error: e };
          }
        }

        if (res?.error && String(res.error?.code) === '42P10') {
          // fallback para insert simples (pode gerar duplicatas se não houver constraint)
          try {
            res = await supabase.from('products').insert(batch);
          } catch (e: any) {
            res = { error: e };
          }
        }

        if (res?.error) {
          console.error('Erro no lote', res.error);
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
      toast.success('Importação concluída!');
    } catch (error: any) {
      console.error(error);
      toast.error('Erro fatal na importação', { description: error.message });
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
        <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-gray-200 shadow-sm text-center">
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
            <label className="rv-btn-primary flex items-center justify-center gap-2 text-white px-6 py-3 rounded-xl font-medium cursor-pointer transition-colors shadow-sm">
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
              className="text-sm rv-text-primary hover:text-indigo-800 underline"
            >
              Baixar modelo de exemplo
            </button>
          </div>
        </div>
      )}

      {/* Passo 2: Preview */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Mapeamento de colunas: escolha qual coluna equivale a cada campo */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 shadow-sm">
            <h4 className="font-semibold mb-3">Mapeamento de Colunas</h4>
            <p className="text-sm text-gray-500 mb-4">
              Selecione as colunas do arquivo que correspondem aos campos do
              sistema. Dica: referência costuma estar em <code>Ref</code> e
              preço em <code>valor</code> ou <code>Preco</code>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Referência (Ref)
                </label>
                <select
                  className="w-full rounded border px-3 py-2"
                  value={mapping.ref || ''}
                  onChange={(e) =>
                    setMapping((m) => ({
                      ...m,
                      ref: e.target.value || undefined,
                    }))
                  }
                >
                  <option value="">-- selecione --</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Nome</label>
                <select
                  className="w-full rounded border px-3 py-2"
                  value={mapping.name || ''}
                  onChange={(e) =>
                    setMapping((m) => ({
                      ...m,
                      name: e.target.value || undefined,
                    }))
                  }
                >
                  <option value="">-- selecione --</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Preço (valor)
                </label>
                <select
                  className="w-full rounded border px-3 py-2"
                  value={mapping.price || ''}
                  onChange={(e) =>
                    setMapping((m) => ({
                      ...m,
                      price: e.target.value || undefined,
                    }))
                  }
                >
                  <option value="">-- selecione --</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Marca
                </label>
                <select
                  className="w-full rounded border px-3 py-2"
                  value={mapping.brand || ''}
                  onChange={(e) =>
                    setMapping((m) => ({
                      ...m,
                      brand: e.target.value || undefined,
                    }))
                  }
                >
                  <option value="">-- selecione --</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Descrição
                </label>
                <select
                  className="w-full rounded border px-3 py-2"
                  value={mapping.desc || ''}
                  onChange={(e) =>
                    setMapping((m) => ({
                      ...m,
                      desc: e.target.value || undefined,
                    }))
                  }
                >
                  <option value="">-- selecione --</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                Pré-visualização ({previewData.length} itens encontrados)
              </h3>
              <button
                onClick={handleImport}
                disabled={importing}
                className="rv-btn-primary flex items-center gap-2 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-70"
              >
                {importing ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <CheckCircle size={20} />
                )}
                Confirmar Importação
              </button>
            </div>

            <div className="w-full overflow-x-auto shadow-sm border border-gray-100 rounded-lg max-h-96">
              <table className="w-full text-sm text-left min-w-full">
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
                        {String(
                          getField(row, mapping.ref) ||
                            getField(row, 'Referencia') ||
                            getField(row, 'Ref') ||
                            getField(row, 'sku') ||
                            '-'
                        )}
                      </td>
                      <td className="px-4 py-2 font-medium">
                        {String(
                          getField(row, mapping.name) ||
                            getField(row, 'Nome') ||
                            getField(row, 'name') ||
                            'Sem Nome'
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {String(
                          getField(row, mapping.price) ||
                            getField(row, 'Preco') ||
                            getField(row, 'valor') ||
                            getField(row, 'price') ||
                            '0'
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        {String(
                          getField(row, mapping.brand) ||
                            getField(row, 'Marca') ||
                            getField(row, 'brand') ||
                            '-'
                        )}
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
              className="rv-btn-primary px-6 py-3 text-white rounded-lg font-medium flex items-center justify-center gap-2"
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
