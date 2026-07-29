'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { parseExcelAction } from '@/modules/factory-line-import/application/parse-excel-action';
import { commitImportAction } from '@/modules/factory-line-import/application/commit-import-action';
import { ImportSheetType, ImportScope, ParseExcelResult } from '@/modules/factory-line-import/domain/types';
import { AlertCircle, CheckCircle2, FileSpreadsheet, Upload, CheckCircle } from 'lucide-react';

export function FactoryLineImportClient() {
  const [file, setFile] = useState<File | null>(null);
  const [brand, setBrand] = useState('');
  const [sheetType, setSheetType] = useState<ImportSheetType>('FULL_CATALOG');
  const [scope, setScope] = useState<ImportScope>('GLOBAL');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  
  const [preview, setPreview] = useState<ParseExcelResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [confirmText, setConfirmText] = useState('');
  
  // Create a stable idempotency key when file is selected
  const [idempotencyKey, setIdempotencyKey] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      const ext = selected.name.split('.').pop()?.toLowerCase();
      if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
        setErrorMsg('Por favor, selecione um arquivo Excel válido (.xlsx, .xls) ou .csv');
        setFile(null);
        return;
      }
      setFile(selected);
      setErrorMsg('');
      setPreview(null);
      setSuccessMsg('');
      setConfirmText('');
      setIdempotencyKey(crypto.randomUUID());
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setErrorMsg('Por favor, selecione um arquivo.');
      return;
    }
    if (!brand.trim()) {
      setErrorMsg('Por favor, informe a marca.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setPreview(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('brand', brand.trim());
    formData.append('sheetType', sheetType);

    try {
      const result = await parseExcelAction(formData);
      if (result.error) {
        setErrorMsg(result.error);
      } else {
        setPreview(result);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro ao processar o arquivo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!file || !preview) return;
    
    if (scope === 'GLOBAL' && confirmText !== 'CONFIRMAR ATUALIZAÇÃO GLOBAL') {
      setErrorMsg('Para atualização global, digite CONFIRMAR ATUALIZAÇÃO GLOBAL no campo de confirmação.');
      return;
    }

    setIsCommitting(true);
    setErrorMsg('');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('brand', preview.brand);
    formData.append('sheetType', preview.sheetType);
    formData.append('scope', scope);
    formData.append('idempotencyKey', idempotencyKey);

    try {
      const result = await commitImportAction(formData);
      if (result.error) {
        setErrorMsg(result.error);
      } else {
        setSuccessMsg(`Atualização concluída! ${result.stats?.updated} alterados, ${result.stats?.conflicts} conflitos, ${result.stats?.failed} falhas.`);
        setPreview(null); // Clear preview to prevent double submit
        setFile(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao efetivar a atualização.');
    } finally {
      setIsCommitting(false);
    }
  };

  const renderPreviewStats = () => {
    if (!preview) return null;

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Linhas Lidas</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{preview.totalRows}</div>
            <p className="text-xs text-muted-foreground">
              {preview.validRows} válidas, {preview.invalidRows} inválidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Referências Encontradas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{preview.foundReferences}</div>
            <p className="text-xs text-muted-foreground">
              de {preview.uniqueReferences} ref. únicas ({preview.notFoundReferences} não enc.)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Afetados</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{preview.totalProductsAffected}</div>
            <p className="text-xs text-muted-foreground">
              em {preview.totalUsersAffected} reps, {preview.totalCompaniesAffected} emps, {preview.totalOrganizationsAffected} orgs
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Simulação de Ações</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <div>Ativar: <span className="font-bold text-green-600">{preview.productsToActivate}</span></div>
              <div>Desativar: <span className="font-bold text-red-600">{preview.productsToDeactivate}</span></div>
              <div className="text-muted-foreground">Mantidos (Sem alteração): {preview.productsKeptActive + preview.productsUnchanged}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderPreviewTable = () => {
    if (!preview || preview.details.length === 0) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por Referência</CardTitle>
          <CardDescription>
            Mostrando os resultados da comparação baseada em Aliases e Referências Normalizadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3">Referência</th>
                <th className="px-4 py-3">Ref Normalizada</th>
                <th className="px-4 py-3">Ação Simulada</th>
                <th className="px-4 py-3">Status Planilha</th>
                <th className="px-4 py-3">Status Atual</th>
                <th className="px-4 py-3">Catálogos Afetados</th>
                <th className="px-4 py-3">Mensagem</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {preview.details.slice(0, 100).map((row, i) => (
                <tr key={i} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{row.originalReference}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.normalizedReference}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold
                      ${row.simulatedAction === 'ACTIVATE' ? 'bg-green-100 text-green-700' : ''}
                      ${row.simulatedAction === 'DEACTIVATE' ? 'bg-red-100 text-red-700' : ''}
                      ${row.simulatedAction === 'KEEP_ACTIVE' ? 'bg-blue-100 text-blue-700' : ''}
                      ${row.simulatedAction === 'KEEP_INACTIVE' ? 'bg-gray-100 text-gray-700' : ''}
                      ${row.simulatedAction === 'NONE' ? 'bg-gray-100 text-gray-500' : ''}
                    `}>
                      {row.simulatedAction}
                    </span>
                  </td>
                  <td className="px-4 py-3">{row.factoryStatus || '-'}</td>
                  <td className="px-4 py-3">{row.currentSystemStatus}</td>
                  <td className="px-4 py-3">
                    {row.matchingProductsCount} <span className="text-muted-foreground text-xs">({row.affectedRepsCount} reps, {row.affectedOrgsCount} orgs)</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{row.validationMessage}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {preview.details.length > 100 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Mostrando apenas as 100 primeiras linhas na prévia. O total de referências únicas é {preview.details.length}.
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="p-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg flex items-center shadow-sm">
          <CheckCircle className="w-5 h-5 mr-3 text-green-600" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Configuração da Importação</CardTitle>
          <CardDescription>
            Selecione a marca e o tipo da planilha para análise comparativa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Código Oficial da Marca</Label>
              <Input 
                id="brand" 
                placeholder="Ex: TOMMY HILFIGER" 
                value={brand}
                onChange={(e) => setBrand(e.target.value.toUpperCase())}
              />
              <p className="text-xs text-muted-foreground">O sistema resolverá os Aliases predefinidos (ex: TOMMY, TH) automaticamente.</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sheetType">Tipo de Planilha</Label>
              <select 
                id="sheetType"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={sheetType}
                onChange={(e) => setSheetType(e.target.value as ImportSheetType)}
              >
                <option value="FULL_CATALOG">Linha completa disponível (desativa ausentes)</option>
                <option value="ONLY_OUT_OF_STOCK">Somente produtos fora de linha</option>
                <option value="ONLY_IN_STOCK">Somente produtos disponíveis</option>
                <option value="STATUS_COLUMN">Planilha com coluna de status</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scope">Escopo de Atualização</Label>
              <select 
                id="scope"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={scope}
                onChange={(e) => setScope(e.target.value as ImportScope)}
              >
                <option value="GLOBAL">Global (Todos os catálogos da plataforma)</option>
                <option value="ORGANIZATION">Somente uma Organização</option>
                <option value="COMPANY">Somente uma Empresa</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label htmlFor="file">Arquivo Excel (.xlsx, .xls, .csv)</Label>
            <Input 
              id="file" 
              type="file" 
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
            />
          </div>

          {errorMsg && (
            <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              {errorMsg}
            </div>
          )}

          <div className="pt-4 flex justify-end">
            <Button onClick={handleAnalyze} disabled={isLoading || !file || !brand.trim() || isCommitting}>
              {isLoading ? (
                <>Analisando...</>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Gerar Prévia
                </>
              )}
            </Button>
          </div>

        </CardContent>
      </Card>

      {renderPreviewStats()}
      {renderPreviewTable()}

      {preview && (
        <Card className="border-primary/50 shadow-md bg-primary/5">
          <CardHeader>
            <CardTitle className="text-primary">Efetivar Atualização</CardTitle>
            <CardDescription>
              As alterações serão salvas no banco de dados. Um histórico detalhado será gerado, e produtos alterados por terceiros entre a análise e a efetivação serão marcados como conflito e preservados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {scope === 'GLOBAL' && (
              <div className="space-y-2 max-w-sm">
                <Label htmlFor="confirmText" className="text-red-600 font-bold">
                  Atenção: Ação Global. Digite "CONFIRMAR ATUALIZAÇÃO GLOBAL" para continuar.
                </Label>
                <Input 
                  id="confirmText"
                  placeholder="CONFIRMAR ATUALIZAÇÃO GLOBAL"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="border-red-300 focus-visible:ring-red-500"
                />
              </div>
            )}

            <div className="flex justify-end items-center">
              <Button 
                onClick={handleCommit} 
                disabled={isCommitting || isLoading || (scope === 'GLOBAL' && confirmText !== 'CONFIRMAR ATUALIZAÇÃO GLOBAL')}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isCommitting ? (
                  <>Efetivando...</>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Aplicar {preview.productsToActivate + preview.productsToDeactivate} Alterações
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
