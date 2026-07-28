import { parseExcelAction } from '@/modules/factory-line-import/application/parse-excel-action';
import { commitImportAction } from '@/modules/factory-line-import/application/commit-import-action';
import { getActiveUserId } from '@/lib/auth-utils';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

jest.mock('@/lib/auth-utils', () => ({
  getActiveUserId: jest.fn(),
}));

const mockSupabase = {
  from: jest.fn(),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}));

jest.mock('xlsx', () => {
  return {
    read: jest.fn().mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: { Sheet1: {} }
    }),
    utils: {
      sheet_to_json: jest.fn().mockReturnValue([
        ['Referencia', 'Status'],
        ['REF123', 'Ativo']
      ])
    }
  };
});

describe('Factory Line Import Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FACTORY_LINE_IMPORT_ENABLED = 'true';
  });

  describe('parseExcelAction', () => {
    it('returns error when no file is provided', async () => {
      const formData = new FormData();
      formData.append('brand', 'OAKLEY');
      formData.append('sheetType', 'FULL_CATALOG');

      const result = await parseExcelAction(formData);
      expect(result.error).toBe('Nenhum arquivo enviado.');
    });

    it('returns error when brand is missing', async () => {
      const formData = new FormData();
      const mockFile = new File([''], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(0));
      formData.append('file', mockFile);
      formData.append('sheetType', 'FULL_CATALOG');

      const result = await parseExcelAction(formData);
      expect(result.error).toBe('A marca não foi selecionada.');
    });

    it('returns error when user is unauthorized', async () => {
      (getActiveUserId as jest.Mock).mockResolvedValue(null);
      const formData = new FormData();
      const mockFile = new File([''], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(0));
      formData.append('file', mockFile);
      formData.append('brand', 'OAKLEY');
      formData.append('sheetType', 'FULL_CATALOG');

      const result = await parseExcelAction(formData);
      expect(result.error).toBe('Usuário não autenticado.');
    });

    it('validates user is admin/master and parses valid rows', async () => {
      (getActiveUserId as jest.Mock).mockResolvedValue('user-admin-123');
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { role: 'admin' } }),
          };
        }
        if (table === 'products') {
          return {
            select: jest.fn().mockReturnThis(),
            ilike: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({
              data: [
                { id: 'prod-1', reference_code: 'REF123', brand: 'OAKLEY', is_active: true, user_id: 'user-1' }
              ]
            }),
          };
        }
        return {};
      });

      // Mock XLSX sheet_to_json return value directly in global mock or mock it here
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        ['Referencia', 'Status'],
        ['REF123', 'Ativo']
      ]);

      const formData = new FormData();
      const mockFile = new File([new Uint8Array([1, 2, 3])], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      mockFile.arrayBuffer = jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);
      formData.append('file', mockFile);
      formData.append('brand', 'OAKLEY');
      formData.append('sheetType', 'STATUS_COLUMN');

      const result = await parseExcelAction(formData);
      expect(result.error).toBeUndefined();
      expect(result.totalRows).toBe(1);
      expect(result.uniqueReferences).toBe(1);
      expect(result.foundReferences).toBe(1);
      expect(result.totalProductsAffected).toBe(1);
    });
  });

  describe('commitImportAction', () => {
    it('returns error when parameters are missing', async () => {
      const formData = new FormData();
      const result = await commitImportAction(formData);
      expect(result.error).toBe('Faltam parâmetros obrigatórios.');
    });

    it('returns error when user is not admin', async () => {
      (getActiveUserId as jest.Mock).mockResolvedValue('user-admin-123');
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { role: 'user' } }),
          };
        }
        return {};
      });

      const formData = new FormData();
      const mockFile = new File([''], 'test.xlsx');
      mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(0));
      formData.append('file', mockFile);
      formData.append('brand', 'OAKLEY');
      formData.append('sheetType', 'FULL_CATALOG');
      formData.append('idempotencyKey', 'key-123');

      const result = await commitImportAction(formData);
      expect(result.error).toBe('Acesso negado.');
    });

    it('successfully processes commit and calls apply_factory_line_import_batch rpc', async () => {
      (getActiveUserId as jest.Mock).mockResolvedValue('user-admin-123');
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { role: 'admin' } }),
          };
        }
        if (table === 'factory_line_imports') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null }),
            insert: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { id: 'import-uuid-123' } }),
            update: jest.fn().mockReturnThis(),
          };
        }
        if (table === 'products') {
          return {
            select: jest.fn().mockReturnThis(),
            ilike: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({
              data: [
                { id: 'prod-1', reference_code: 'REF123', brand: 'OAKLEY', is_active: true, user_id: 'user-1' }
              ]
            }),
          };
        }
        return {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: {} }),
        };
      });

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: { updated: 1, unchanged: 0, conflicts: 0, failed: 0 }
      });

      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        ['Referencia', 'Status'],
        ['REF123', 'Inativo']
      ]);

      const formData = new FormData();
      const mockFile = new File([''], 'test.xlsx');
      mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(0));
      formData.append('file', mockFile);
      formData.append('brand', 'OAKLEY');
      formData.append('sheetType', 'STATUS_COLUMN');
      formData.append('idempotencyKey', 'key-123');

      const result = await commitImportAction(formData);
      expect(result.error).toBeUndefined();
      expect(result.success).toBe(true);
      expect(result.importId).toBe('import-uuid-123');
      expect(result.stats?.updated).toBe(1);
      expect((mockSupabase as any).rpc).toHaveBeenCalledWith('apply_factory_line_import_batch', expect.any(Object));
    });
  });
});
