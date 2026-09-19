import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServerUserFallback } from '@/lib/supabase/getServerUserFallback';

type Classification =
  | 'regenerable_data_fidelity'
  | 'preserved_historical_original'
  | 'unknown';

type StorageFile = {
  name: string;
  path: string;
  size_bytes: number;
  updated_at: string | null;
};

// Adapted to reflect the REAL columns in public.orders table
type OrderRow = {
  id: string;
  commercial_status?: string | null;
  operational_status?: string | null;
  status?: string | null;
  approved_at?: string | null;
};

const BUCKET = 'orders';

function extractOrderId(path: string): string | null {
  const uuidMatch = path.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
  );

  return uuidMatch?.[0] || null;
}

async function listStorageFilesRecursive(
  supabase: ReturnType<typeof createAdminClient>,
  bucket: string,
  prefix = ''
): Promise<StorageFile[]> {
  const output: StorageFile[] = [];

  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, {
        limit,
        offset,
        sortBy: {
          column: 'name',
          order: 'asc',
        },
      });

    if (error) {
      throw new Error(
        `Erro ao listar Storage em "${prefix || '/'}": ${error.message}`
      );
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const item of data) {
      const fullPath = prefix
        ? `${prefix}/${item.name}`
        : item.name;

      const metadata = item.metadata as any;

      const looksLikeFile =
        metadata &&
        (
          typeof metadata.size === 'number' ||
          metadata.mimetype ||
          metadata.cacheControl
        );

      if (!looksLikeFile) {
        const nested = await listStorageFilesRecursive(
          supabase,
          bucket,
          fullPath
        );

        output.push(...nested);
        continue;
      }

      output.push({
        name: item.name,
        path: fullPath,
        size_bytes: Number(metadata?.size || 0),
        updated_at: item.updated_at || null,
      });
    }

    if (data.length < limit) {
      break;
    }

    offset += limit;
  }

  return output;
}

function classifyOrderPdf(
  order: OrderRow | null
): {
  classification: Classification;
  has_signature: boolean;
  order_status: string | null;
} {
  if (!order) {
    return {
      classification: 'unknown',
      has_signature: false,
      order_status: null,
    };
  }

  // As colunas originais sugeridas (signed_at, signature_url, signature_path) NÃO existem na tabela orders.
  // Usamos as colunas de aprovação/status encontradas (approved_at, commercial_status, operational_status, status)
  const hasSignature = false; 

  const isApproved =
    !!order.approved_at ||
    order.commercial_status === 'approved' ||
    order.operational_status === 'approved' ||
    order.status === 'approved';

  const orderStatus =
    order.operational_status ||
    order.commercial_status ||
    order.status ||
    null;

  if (isApproved) {
    return {
      classification: 'preserved_historical_original',
      has_signature: hasSignature,
      order_status: orderStatus,
    };
  }

  return {
    classification: 'regenerable_data_fidelity',
    has_signature: hasSignature,
    order_status: orderStatus,
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUserFallback();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const admin = createAdminClient();

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (profile?.role !== 'master') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);

    const page = Math.max(
      1,
      Number(url.searchParams.get('page') || '1')
    );

    const pageSize = Math.min(
      100,
      Math.max(
        1,
        Number(url.searchParams.get('page_size') || '25')
      )
    );

    const classificationFilter =
      url.searchParams.get('classification') || 'all';

    const search = (
      url.searchParams.get('search') || ''
    )
      .trim()
      .toLowerCase();

    const allFiles = await listStorageFilesRecursive(
      admin,
      BUCKET
    );

    const pdfFiles = allFiles.filter((file) =>
      file.name.toLowerCase().endsWith('.pdf')
    );

    const orderIds = Array.from(
      new Set(
        pdfFiles
          .map((file) => extractOrderId(file.path))
          .filter(Boolean)
      )
    ) as string[];

    const ordersById = new Map<string, OrderRow>();

    if (orderIds.length > 0) {
      const chunkSize = 200;

      for (let i = 0; i < orderIds.length; i += chunkSize) {
        const chunk = orderIds.slice(i, i + chunkSize);

        // Seleciona SOMENTE as colunas que de fato existem na tabela orders
        const { data: orders, error: ordersError } = await admin
          .from('orders')
          .select(`
            id,
            commercial_status,
            operational_status,
            status,
            approved_at
          `)
          .in('id', chunk);

        if (ordersError) {
          console.error(
            '[storage-cleanup/orders] orders lookup error:',
            ordersError
          );

          throw ordersError;
        }

        for (const order of orders || []) {
          ordersById.set(order.id, order as OrderRow);
        }
      }
    }

    let items = pdfFiles.map((file) => {
      const orderId = extractOrderId(file.path);

      const order = orderId
        ? ordersById.get(orderId) || null
        : null;

      const classificationData =
        classifyOrderPdf(order);

      const { data: publicUrlData } = admin.storage
        .from(BUCKET)
        .getPublicUrl(file.path);

      return {
        name: file.name,
        path: file.path,
        order_id: orderId,
        size_bytes: file.size_bytes,
        size_kb: (
          file.size_bytes / 1024
        ).toFixed(1),
        classification:
          classificationData.classification,
        has_signature:
          classificationData.has_signature,
        order_status:
          classificationData.order_status,
        public_url:
          publicUrlData?.publicUrl || '',
        updated_at:
          file.updated_at || '',
      };
    });

    if (search) {
      items = items.filter((item) => {
        return (
          item.name.toLowerCase().includes(search) ||
          item.path.toLowerCase().includes(search) ||
          item.order_id?.toLowerCase().includes(search)
        );
      });
    }

    const allClassifiedItems = [...items];

    if (classificationFilter !== 'all') {
      items = items.filter(
        (item) =>
          item.classification === classificationFilter
      );
    }

    const regenerableItems =
      allClassifiedItems.filter(
        (item) =>
          item.classification ===
          'regenerable_data_fidelity'
      );

    const preservedItems =
      allClassifiedItems.filter(
        (item) =>
          item.classification ===
          'preserved_historical_original'
      );

    const unknownItems =
      allClassifiedItems.filter(
        (item) =>
          item.classification === 'unknown'
      );

    const totalRegenerableBytes =
      regenerableItems.reduce(
        (sum, item) => sum + item.size_bytes,
        0
      );

    const totalItems = items.length;

    const totalPages = Math.max(
      1,
      Math.ceil(totalItems / pageSize)
    );

    const start =
      (page - 1) * pageSize;

    const pagedItems =
      items.slice(start, start + pageSize);

    return NextResponse.json({
      items: pagedItems,

      total_items: totalItems,
      total_pages: totalPages,

      regenerable_count:
        regenerableItems.length,

      preserved_count:
        preservedItems.length,

      unknown_count:
        unknownItems.length,

      total_regenerable_bytes:
        totalRegenerableBytes,

      debug: {
        bucket: BUCKET,
        total_files_scanned:
          allFiles.length,
        total_pdfs_found:
          pdfFiles.length,
        total_order_ids_found:
          orderIds.length,
        total_orders_matched:
          ordersById.size,
      },
    });
  } catch (error: any) {
    console.error(
      '[storage-cleanup/orders] GET error:',
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Erro ao auditar PDFs de pedidos',
      },
      { status: 500 }
    );
  }
}
