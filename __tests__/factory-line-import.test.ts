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
  rpc: jest.fn(),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}));

jest.mock('xlsx', () => {
  return {
    read: jest.fn().mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: { Sheet1: {} },
    }),
    utils: {
      sheet_to_json: jest.fn().mockReturnValue([
        ['Referencia', 'Status'],
        ['REF123', 'Ativo'],
      ]),
    },
  };
});

describe('Factory Line Import Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete (mockSupabase as any).rpc;
    process.env.FACTORY_LINE_IMPORT_ENABLED = 'true';

    (XLSX.read as jest.Mock).mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: { Sheet1: {} },
    });

    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
      ['Referencia', 'Status'],
      ['REF123', 'Ativo'],
    ]);
  });

  describe('Feature Flag & Governance', () => {
    it('returns error when factory line import feature is disabled', async () => {
      process.env.FACTORY_LINE_IMPORT_ENABLED = 'false';

      const formData = new FormData();
      const mockFile = new File(['test'], 'test.xlsx');
      mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(4));
      formData.append('file', mockFile);
      formData.append('brand', 'OAKLEY');
      formData.append('sheetType', 'FULL_CATALOG');

      const result = await parseExcelAction(formData);
      expect(result.error).toBeDefined();
    });
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
      const mockFile = new File([''], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(0));
      formData.append('file', mockFile);
      formData.append('sheetType', 'FULL_CATALOG');

      const result = await parseExcelAction(formData);
      expect(result.error).toBe('A marca não foi selecionada.');
    });

    it('returns error when user is unauthorized', async () => {
      (getActiveUserId as jest.Mock).mockResolvedValue(null);
      const formData = new FormData();
      const mockFile = new File([''], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(0));
      formData.append('file', mockFile);
      formData.append('brand', 'OAKLEY');
      formData.append('sheetType', 'FULL_CATALOG');

      const result = await parseExcelAction(formData);
      expect(result.error).toBe('Usuário não autenticado.');
    });

    it.each(['admin', 'master', 'admin_company', 'company_admin'])(
      'validates user role %s and parses valid rows successfully',
      async (role) => {
        (getActiveUserId as jest.Mock).mockResolvedValue('user-admin-123');

        mockSupabase.from.mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: { role } }),
              maybeSingle: jest.fn().mockResolvedValue({ data: { role } }),
            };
          }
          if (table === 'products') {
            return {
              select: jest.fn().mockReturnThis(),
              ilike: jest.fn().mockReturnThis(),
              range: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 'prod-1',
                    reference_code: 'REF123',
                    brand: 'OAKLEY',
                    is_active: true,
                    user_id: 'user-1',
                  },
                ],
              }),
            };
          }
          return {};
        });

        (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
          ['Referencia', 'Status'],
          ['REF123', 'Ativo'],
        ]);

        const formData = new FormData();
        const mockFile = new File([new Uint8Array([1, 2, 3])], 'test.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        mockFile.arrayBuffer = jest
          .fn()
          .mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);
        formData.append('file', mockFile);
        formData.append('brand', 'OAKLEY');
        formData.append('sheetType', 'STATUS_COLUMN');

        const result = await parseExcelAction(formData);
        expect(result.error).toBeUndefined();
        expect(result.totalRows).toBe(1);
        expect(result.uniqueReferences).toBe(1);
        expect(result.foundReferences).toBe(1);
        expect(result.totalProductsAffected).toBe(1);
      },
    );

    it('handles deduplication when spreadsheet contains repeated references', async () => {
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
                {
                  id: 'prod-1',
                  reference_code: 'REF123',
                  brand: 'OAKLEY',
                  is_active: true,
                  user_id: 'user-1',
                },
              ],
            }),
          };
        }
        return {};
      });

      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        ['Referencia', 'Status'],
        ['REF123', 'Ativo'],
        ['REF123', 'Inativo'],
      ]);

      const formData = new FormData();
      const mockFile = new File([new Uint8Array([1, 2, 3])], 'test.xlsx');
      mockFile.arrayBuffer = jest
        .fn()
        .mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);
      formData.append('file', mockFile);
      formData.append('brand', 'OAKLEY');
      formData.append('sheetType', 'STATUS_COLUMN');

      const result = await parseExcelAction(formData);
      expect(result.totalRows).toBe(2);
      expect(result.uniqueReferences).toBe(1);
    });

    it('reports references that were not found in database', async () => {
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
              data: [],
            }),
          };
        }
        return {};
      });

      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        ['Referencia', 'Status'],
        ['REF999', 'Ativo'],
      ]);

      const formData = new FormData();
      const mockFile = new File([new Uint8Array([1, 2, 3])], 'test.xlsx');
      mockFile.arrayBuffer = jest
        .fn()
        .mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);
      formData.append('file', mockFile);
      formData.append('brand', 'OAKLEY');
      formData.append('sheetType', 'STATUS_COLUMN');

      const result = await parseExcelAction(formData);
      expect(result.foundReferences).toBe(0);
      expect(result.notFoundReferences).toBe(1);
    });
  });

  describe('commitImportAction', () => {
    it('returns error when parameters are missing', async () => {
      const formData = new FormData();
      const result = await commitImportAction(formData);
      expect(result.error).toBe('Faltam parâmetros obrigatórios.');
    });

    it('returns error when user is not admin', async () => {
      (getActiveUserId as jest.Mock).mockResolvedValue('user-common-123');
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { role: 'user' } }),
            maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'user' } }),
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

    it('returns completed response if idempotency key was already processed', async () => {
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
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'import-existing-123',
                status: 'COMPLETED',
                affected_count: 5,
              },
            }),
          };
        }
        return {};
      });

      const formData = new FormData();
      const mockFile = new File([''], 'test.xlsx');
      mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(0));
      formData.append('file', mockFile);
      formData.append('brand', 'OAKLEY');
      formData.append('sheetType', 'STATUS_COLUMN');
      formData.append('idempotencyKey', 'key-existing-123');

      const result = await commitImportAction(formData);
      expect(result.error).toBe('Esta importação já foi processada.');
    });

    it('handles RPC error during batch processing', async () => {
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
                { id: 'prod-1', reference_code: 'REF123', brand: 'OAKLEY', is_active: true, user_id: 'user-1' },
              ],
            }),
          };
        }
        return {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: {} }),
        };
      });

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Falha na RPC de atualização em lote' },
      });

      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        ['Referencia', 'Status'],
        ['REF123', 'Inativo'],
      ]);

      const formData = new FormData();
      const mockFile = new File([''], 'test.xlsx');
      mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(0));
      formData.append('file', mockFile);
      formData.append('brand', 'OAKLEY');
      formData.append('sheetType', 'STATUS_COLUMN');
      formData.append('idempotencyKey', 'key-123');

      const result = await commitImportAction(formData);
      expect(result.success).toBe(true);
      expect(result.stats?.failed).toBe(1);
    });

    it('successfully processes commit and calls apply_factory_line_import_batch rpc', async () => {
      (getActiveUserId as jest.Mock).mockResolvedValue('user-admin-123');

      const profileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
      };

      const existingImportQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      const createImportQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'import-uuid-123' }, error: null }),
      };

      const productsQuery = {
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'prod-1',
              reference_code: 'REF123',
              brand: 'OAKLEY',
              is_active: true,
              user_id: 'user-1',
            },
          ],
          error: null,
        }),
      };

      const finishImportQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profileQuery;
        if (table === 'factory_line_imports') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null }),
            insert: createImportQuery.insert,
            update: finishImportQuery.update,
          };
        }
        if (table === 'products') return productsQuery;
        return finishImportQuery;
      });

      createImportQuery.insert.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { id: 'import-uuid-123' }, error: null }),
        }),
      });

      finishImportQuery.update.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      (mockSupabase as any).rpc = jest.fn().mockResolvedValue({
        data: { updated: 1, unchanged: 0, conflicts: 0, failed: 0 },
        error: null,
      });

      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        ['Referencia', 'Status'],
        ['REF123', 'Inativo'],
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
      expect((mockSupabase as any).rpc).toHaveBeenCalledWith(
        'apply_factory_line_import_batch',
        expect.any(Object),
      );
    });
  });
});
