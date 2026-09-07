import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { isGlobalAdmin } from '@/lib/auth/roles';
import crypto from 'crypto';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createSupabaseClient(url, key);
}

export interface OrderPdfInventoryItem {
  name: string;
  path: string; // Ex: "1042.pdf" ou "uuid.pdf"
  order_id: string | null;
  size_bytes: number;
  size_kb: string;
  classification: 'regenerable_data_fidelity' | 'preserved_historical_original' | 'unknown';
  has_signature: boolean;
  order_status: string | null;
  public_url: string;
  updated_at: string;
}

// ----------------------------------------------------------------------------
// GET: Auditoria e Listagem Classificada do Bucket 'orders'
// ----------------------------------------------------------------------------
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'master') {
      return NextResponse.json(
        { error: 'Acesso negado. Requer permissão exclusiva de usuário master.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(250, Math.max(1, parseInt(searchParams.get('page_size') || '25', 10)));
    const classificationFilter = searchParams.get('classification') || 'all'; // 'all' | 'regenerable_data_fidelity' | 'preserved_historical_original' | 'unknown'
    const searchQuery = (searchParams.get('search') || '').trim().toLowerCase();

    const serviceSupabase = getServiceSupabase();

    // 1. Listagem estrita do bucket 'orders' (apenas raiz)
    const { data: storageFiles, error: listErr } = await serviceSupabase.storage
      .from('orders')
      .list('', { limit: 1000 });

    if (listErr) {
      return NextResponse.json({ error: `Erro ao acessar bucket orders: ${listErr.message}` }, { status: 500 });
    }

    // Filtra estritamente arquivos com extensão .pdf (despreza pastas ou outros formatos)
    const pdfFiles = (storageFiles || []).filter((f) => f.name.toLowerCase().endsWith('.pdf'));

    // 2. Busca pedidos correspondentes para classificação em lote
    const orderIdentifiers = pdfFiles.map((f) => f.name.replace(/\.pdf$/i, ''));

    // Consulta banco de dados para os pedidos
    const { data: dbOrders } = await serviceSupabase
      .from('orders')
      .select(
        `
        id,
        display_id,
        status,
        notes,
        pdf_url,
        total_value,
        created_at,
        client_name_guest,
        client_cnpj_guest,
        order_items (
          id,
          product_name,
          unit_price,
          quantity
        )
      `
      )
      .or(
        `id.in.(${orderIdentifiers.filter((x) => x.includes('-')).join(',') || '00000000-0000-0000-0000-000000000000'}),display_id.in.(${orderIdentifiers.filter((x) => /^\d+$/.test(x)).join(',') || '-1'})`
      );

    const ordersMap = new Map<string, any>();
    (dbOrders || []).forEach((o) => {
      ordersMap.set(String(o.id), o);
      if (o.display_id) ordersMap.set(String(o.display_id), o);
    });

    const items: OrderPdfInventoryItem[] = [];
    let regenerableCount = 0;
    let preservedCount = 0;
    let unknownCount = 0;
    let totalRegenerableBytes = 0;

    for (const file of pdfFiles) {
      const fileKey = file.name.replace(/\.pdf$/i, '');
      const order = ordersMap.get(fileKey);
      const sizeBytes = Number((file.metadata as any)?.size || (file as any)?.size || 0);

      let classification: 'regenerable_data_fidelity' | 'preserved_historical_original' | 'unknown' = 'unknown';
      let hasSignature = false;

      if (order) {
        const notesStr = String(order.notes || '');
        hasSignature = /Assinatura:\s*(https?:\/\/\S+)/i.test(notesStr) || notesStr.toLowerCase().includes('assinatura');
        const isApprovedOrSigned = ['approved', 'confirmed', 'delivered', 'signed'].includes(String(order.status).toLowerCase());

        // Regra 5: Preservar permanentemente original quando assinado, aprovado ou comercialmente confirmado
        if (hasSignature || isApprovedOrSigned) {
          classification = 'preserved_historical_original';
          preservedCount++;
        } else {
          // Checagem de integridade dos dados do snapshot
          const hasCustomerInfo = Boolean(order.client_name_guest || order.client_cnpj_guest);
          const hasItems = Array.isArray(order.order_items) && order.order_items.length > 0;
          const hasValidTotal = Number(order.total_value || 0) >= 0;

          if (hasCustomerInfo && hasItems && hasValidTotal) {
            classification = 'regenerable_data_fidelity';
            regenerableCount++;
            totalRegenerableBytes += sizeBytes;
          } else {
            classification = 'unknown';
            unknownCount++;
          }
        }
      } else {
        classification = 'unknown';
        unknownCount++;
      }

      const { data: pubData } = serviceSupabase.storage.from('orders').getPublicUrl(file.name);

      items.push({
        name: file.name,
        path: file.name,
        order_id: order?.id || null,
        size_bytes: sizeBytes,
        size_kb: (sizeBytes / 1024).toFixed(2),
        classification,
        has_signature: hasSignature,
        order_status: order?.status || null,
        public_url: pubData?.publicUrl || '',
        updated_at: file.updated_at || file.created_at || new Date().toISOString(),
      });
    }

    // Filtragem no Backend
    let filtered = items;
    if (classificationFilter !== 'all') {
      filtered = filtered.filter((i) => i.classification === classificationFilter);
    }
    if (searchQuery) {
      filtered = filtered.filter((i) => i.name.toLowerCase().includes(searchQuery) || i.path.toLowerCase().includes(searchQuery));
    }

    const total_items = filtered.length;
    const total_pages = Math.ceil(total_items / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const itemsPage = filtered.slice(startIndex, startIndex + pageSize);

    return NextResponse.json({
      items: itemsPage,
      page,
      page_size: pageSize,
      total_items,
      total_pages,
      total_files: pdfFiles.length,
      regenerable_count: regenerableCount,
      preserved_count: preservedCount,
      unknown_count: unknownCount,
      total_regenerable_bytes: totalRegenerableBytes,
    });
  } catch (err: any) {
    console.error('Order Storage Cleanup GET Error:', err);
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}

// ----------------------------------------------------------------------------
// POST: Ações 'summary', 'trash' e 'restore' exclusivamente para PDFs do bucket 'orders'
// ----------------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'master') {
      return NextResponse.json(
        { error: 'Acesso negado. Requer permissão exclusiva de usuário master.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const action = body.action; // 'summary' | 'trash' | 'restore'
    const serviceSupabase = getServiceSupabase();

    // ------------------------------------------------------------------------
    // 1. SUMMARY
    // ------------------------------------------------------------------------
    if (action === 'summary') {
      const { paths } = body;

      // Executa varredura estrita e filtra apenas regenerable_data_fidelity
      const { data: storageFiles } = await serviceSupabase.storage.from('orders').list('', { limit: 1000 });
      const pdfFiles = (storageFiles || []).filter((f) => f.name.toLowerCase().endsWith('.pdf'));

      let targetFiles = pdfFiles;
      if (Array.isArray(paths) && paths.length > 0) {
        const pathSet = new Set(paths);
        targetFiles = pdfFiles.filter((f) => pathSet.has(f.name));
      }

      if (targetFiles.length === 0) {
        return NextResponse.json({ error: 'Nenhum PDF de pedido selecionado.' }, { status: 400 });
      }

      if (targetFiles.length > 500) {
        return NextResponse.json({ error: 'O limite máximo por operação é de 500 arquivos de pedidos.' }, { status: 400 });
      }

      // Valida cada arquivo para garantir que seja regenerable_data_fidelity
      const eligibleItems: any[] = [];
      let totalBytes = 0;

      for (const f of targetFiles) {
        const orderKey = f.name.replace(/\.pdf$/i, '');
        const { data: order } = await serviceSupabase
          .from('orders')
          .select('id, notes, status, pdf_url, client_name_guest, order_items(id)')
          .or(`id.eq.${orderKey.includes('-') ? orderKey : '00000000-0000-0000-0000-000000000000'},display_id.eq.${/^\d+$/.test(orderKey) ? orderKey : '-1'}`)
          .maybeSingle();

        if (!order) continue;

        const notesStr = String(order.notes || '');
        const hasSignature = /Assinatura:\s*(https?:\/\/\S+)/i.test(notesStr) || notesStr.toLowerCase().includes('assinatura');
        const isApprovedOrSigned = ['approved', 'confirmed', 'delivered', 'signed'].includes(String(order.status).toLowerCase());

        // Somente elegível se não for assinado nem aprovado comercialmente
        if (!hasSignature && !isApprovedOrSigned && Array.isArray(order.order_items) && order.order_items.length > 0) {
          const sz = Number((f.metadata as any)?.size || (f as any)?.size || 0);
          totalBytes += sz;
          eligibleItems.push({
            order_id: order.id,
            original_path: f.name,
            size_bytes: sz,
            previous_pdf_url: order.pdf_url,
            order_status: order.status,
          });
        }
      }

      if (eligibleItems.length === 0) {
        return NextResponse.json({ error: 'Nenhum arquivo elegível para movimentação (todos os selecionados são protegidos/assinados).' }, { status: 400 });
      }

      // Token criptográfico curto
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      const { data: opData, error: opErr } = await serviceSupabase
        .from('storage_cleanup_operations')
        .insert({
          user_id: user.id,
          operation_type: 'move_to_trash',
          filter_snapshot: { target: 'order_pdfs', count: eligibleItems.length },
          total_items: eligibleItems.length,
          total_bytes: totalBytes,
          status: 'pending',
          token_hash: tokenHash,
          expires_at: expiresAt,
        })
        .select('id')
        .single();

      if (opErr || !opData) {
        return NextResponse.json({ error: 'Erro ao registrar operação de PDF de pedidos' }, { status: 500 });
      }

      const operationId = opData.id;

      // Grava seleção exata em order_pdf_cleanup_items com retenção de 30 dias
      const itemsToInsert = eligibleItems.map((item) => ({
        operation_id: operationId,
        order_id: item.order_id,
        bucket: 'orders',
        original_path: item.original_path,
        trash_path: `trash/${operationId}/orders/${item.original_path}`,
        size_bytes: item.size_bytes,
        classification: 'regenerable_data_fidelity',
        has_signature: false,
        order_status: item.order_status,
        previous_pdf_url: item.previous_pdf_url,
        moved_by: user.id,
        retention_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
        status: 'pending',
      }));

      await serviceSupabase.from('order_pdf_cleanup_items').insert(itemsToInsert);

      return NextResponse.json({
        success: true,
        operation_id: operationId,
        token: rawToken,
        total_items: eligibleItems.length,
        total_bytes: totalBytes,
        total_mb: (totalBytes / (1024 * 1024)).toFixed(2),
        expires_at: expiresAt,
      });
    }

    // ------------------------------------------------------------------------
    // 2. TRASH: Mover para lixeira com retenção de 30 dias e zera orders.pdf_url após mover
    // ------------------------------------------------------------------------
    if (action === 'trash') {
      const { operation_id, token } = body;

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const { data: opRow } = await serviceSupabase
        .from('storage_cleanup_operations')
        .select('*')
        .eq('id', operation_id)
        .eq('token_hash', tokenHash)
        .maybeSingle();

      if (!opRow || opRow.status !== 'pending' || new Date(opRow.expires_at).getTime() < Date.now()) {
        return NextResponse.json({ error: 'Token inválido ou expirado.' }, { status: 400 });
      }

      await serviceSupabase.from('storage_cleanup_operations').update({ status: 'processing' }).eq('id', operation_id);

      const { data: dbItems } = await serviceSupabase.from('order_pdf_cleanup_items').select('*').eq('operation_id', operation_id);

      let movedCount = 0;
      let protectedCount = 0;
      let failedCount = 0;

      for (const item of dbItems || []) {
        try {
          // Double-Lock check do pedido
          const { data: freshOrder } = await serviceSupabase
            .from('orders')
            .select('status, notes')
            .eq('id', item.order_id)
            .maybeSingle();

          const notesStr = String(freshOrder?.notes || '');
          const hasSignature = /Assinatura:\s*(https?:\/\/\S+)/i.test(notesStr);
          const isApproved = ['approved', 'confirmed', 'delivered', 'signed'].includes(String(freshOrder?.status).toLowerCase());

          if (hasSignature || isApproved) {
            protectedCount++;
            await serviceSupabase.from('order_pdf_cleanup_items').update({ status: 'protected', error_message: 'Pedido assinado ou aprovado no interim' }).eq('id', item.id);
            continue;
          }

          // Cópia para a lixeira: trash/{operationId}/orders/{originalPath}
          const { error: copyErr } = await serviceSupabase.storage.from('orders').copy(item.original_path, item.trash_path);

          if (copyErr && !copyErr.message?.includes('already exists')) {
            failedCount++;
            await serviceSupabase.from('order_pdf_cleanup_items').update({ status: 'failed', failed_step: 'copying', error_message: copyErr.message }).eq('id', item.id);
            continue;
          }

          // Remoção do original
          const { error: removeErr } = await serviceSupabase.storage.from('orders').remove([item.original_path]);

          if (removeErr) {
            failedCount++;
            await serviceSupabase.from('order_pdf_cleanup_items').update({ status: 'failed', failed_step: 'source_delete', error_message: removeErr.message }).eq('id', item.id);
          } else {
            movedCount++;
            // Atualiza status do item
            await serviceSupabase.from('order_pdf_cleanup_items').update({ status: 'in_trash', moved_at: new Date().toISOString() }).eq('id', item.id);

            // CORREÇÃO REGRA 7: Define orders.pdf_url = null SOMENTE APÓS confirmar a movimentação
            if (item.order_id) {
              await serviceSupabase.from('orders').update({ pdf_url: null }).eq('id', item.order_id);
            }
          }
        } catch (itemErr: any) {
          failedCount++;
          await serviceSupabase.from('order_pdf_cleanup_items').update({ status: 'failed', error_message: String(itemErr) }).eq('id', item.id);
        }
      }

      await serviceSupabase.from('storage_cleanup_operations').update({ status: failedCount > 0 ? 'partially_failed' : 'completed' }).eq('id', operation_id);

      return NextResponse.json({
        success: true,
        operation_id,
        moved: movedCount,
        protected: protectedCount,
        failed: failedCount,
      });
    }

    // ------------------------------------------------------------------------
    // 3. RESTORE: Restaurar PDF de Pedido da lixeira e restaurar orders.pdf_url
    // ------------------------------------------------------------------------
    if (action === 'restore') {
      const { operation_id, item_ids } = body;

      let query = serviceSupabase.from('order_pdf_cleanup_items').select('*').eq('status', 'in_trash');
      if (operation_id) query = query.eq('operation_id', operation_id);
      else if (Array.isArray(item_ids) && item_ids.length > 0) query = query.in('id', item_ids);
      else return NextResponse.json({ error: 'operation_id ou item_ids são necessários.' }, { status: 400 });

      const { data: itemsToRestore } = await query;
      if (!itemsToRestore || itemsToRestore.length === 0) {
        return NextResponse.json({ error: 'Nenhum PDF de pedido para restaurar.' }, { status: 404 });
      }

      let restoredCount = 0;
      let conflictCount = 0;
      let failedCount = 0;

      for (const item of itemsToRestore) {
        try {
          // Checa se o arquivo de destino já existe no bucket 'orders'
          const { data: existingFiles } = await serviceSupabase.storage.from('orders').list('', { search: item.original_path });
          const exists = (existingFiles || []).some((f) => f.name === item.original_path);

          if (exists) {
            conflictCount++;
            await serviceSupabase.from('order_pdf_cleanup_items').update({ status: 'conflict', error_message: 'Caminho de destino ocupado' }).eq('id', item.id);
            continue;
          }

          // Restaura do trash
          const { error: copyErr } = await serviceSupabase.storage.from('orders').copy(item.trash_path, item.original_path);
          if (copyErr) {
            failedCount++;
            await serviceSupabase.from('order_pdf_cleanup_items').update({ status: 'failed', failed_step: 'restoring', error_message: copyErr.message }).eq('id', item.id);
            continue;
          }

          await serviceSupabase.storage.from('orders').remove([item.trash_path]);

          const { data: pubData } = serviceSupabase.storage.from('orders').getPublicUrl(item.original_path);

          // Restaura a URL em orders.pdf_url
          if (item.order_id) {
            await serviceSupabase.from('orders').update({ pdf_url: pubData?.publicUrl || item.previous_pdf_url }).eq('id', item.order_id);
          }

          restoredCount++;
          await serviceSupabase.from('order_pdf_cleanup_items').update({ status: 'restored', restored_at: new Date().toISOString() }).eq('id', item.id);
        } catch (rErr: any) {
          failedCount++;
          await serviceSupabase.from('order_pdf_cleanup_items').update({ status: 'failed', error_message: String(rErr) }).eq('id', item.id);
        }
      }

      return NextResponse.json({
        success: true,
        restored: restoredCount,
        conflict: conflictCount,
        failed: failedCount,
      });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (err: any) {
    console.error('Order Storage Cleanup POST Error:', err);
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 });
  }
}
