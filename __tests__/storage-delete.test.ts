import { deleteImageIfUnused } from '@/lib/storage';

// jest mocks
describe('deleteImageIfUnused', () => {
  test('does not delete when RPC reports references', async () => {
    const supabaseMock: any = {
      rpc: jest
        .fn()
        .mockResolvedValue({ data: [{ total_refs: 2 }], error: null }),
      storage: {
        from: jest.fn().mockReturnThis(),
        remove: jest.fn().mockResolvedValue({ error: null }),
      },
      from: jest.fn(),
    };

    const res = await deleteImageIfUnused(
      supabaseMock,
      'product-images',
      'u/1/img.jpg'
    );
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/imagem em uso/);
    expect(supabaseMock.storage.from().remove).not.toHaveBeenCalled();
  });

  test('deletes when no references and storage remove succeeds', async () => {
    const supabaseMock: any = {
      rpc: jest
        .fn()
        .mockResolvedValue({ data: [{ total_refs: 0 }], error: null }),
      storage: {
        from: jest.fn().mockReturnThis(),
        remove: jest.fn().mockResolvedValue({ error: null }),
      },
      from: jest.fn(),
    };

    const res = await deleteImageIfUnused(
      supabaseMock,
      'product-images',
      'u/1/img2.jpg'
    );
    expect(res.success).toBe(true);
    expect(supabaseMock.storage.from().remove).toHaveBeenCalled();
  });
});
