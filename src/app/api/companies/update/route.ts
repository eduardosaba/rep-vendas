import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL não configurada');
  }

  return createSupabaseAdmin(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function isMissingColumnError(error: any) {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return (
    code === '42703' ||
    message.includes('column') &&
      (message.includes('does not exist') || message.includes('could not find'))
  );
}

function extractMissingColumnName(error: any): string | null {
  const msg = String(error?.message || '');

  const quoted = msg.match(/column\s+"([^"]+)"\s+(?:of\s+relation\s+"[^"]+"\s+)?does\s+not\s+exist/i);
  if (quoted?.[1]) return quoted[1];

  const apiShape = msg.match(/could not find the '([^']+)' column/i);
  if (apiShape?.[1]) return apiShape[1];

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabaseAdmin = getSupabaseAdmin();
    const supabase = await createClient();
    const { data: authUser } = await supabase.auth.getUser();
    const userId = authUser?.user?.id;
    if (!userId) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .maybeSingle();

    if (pErr) throw pErr;
    const companyId = (profile as any)?.company_id;
    if (!companyId) return NextResponse.json({ success: false, error: 'No company linked' }, { status: 404 });

    const updatePayload: Record<string, any> = {};

    if (typeof body.primary_color === 'string') updatePayload.primary_color = body.primary_color;
    if (typeof body.secondary_color === 'string') updatePayload.secondary_color = body.secondary_color;
    if (typeof body.logo_url === 'string') updatePayload.logo_url = body.logo_url;
    // Support 'name' updates (company display name)
    if (typeof body.name === 'string') updatePayload.name = body.name;
    if (typeof body.cover_image === 'string') updatePayload.cover_image = body.cover_image;
    // accept legacy/alternate key 'cover_url' and map to cover_image
    if (typeof body.cover_url === 'string') updatePayload.cover_image = body.cover_url;
    if (typeof body.cover_image_offset_x !== 'undefined') updatePayload.cover_image_offset_x = Number(body.cover_image_offset_x) || null;
    if (typeof body.cover_image_offset_y !== 'undefined') updatePayload.cover_image_offset_y = Number(body.cover_image_offset_y) || null;
    if (typeof body.headline === 'string') updatePayload.headline = body.headline;
    if (typeof body.welcome_text === 'string') updatePayload.welcome_text = body.welcome_text;
    // Social links and handles
    if (typeof body.instagram_handle === 'string') updatePayload.instagram_handle = body.instagram_handle;
    if (typeof body.instagram_url === 'string') updatePayload.instagram_url = body.instagram_url;
    if (typeof body.facebook_handle === 'string') updatePayload.facebook_handle = body.facebook_handle;
    if (typeof body.facebook_url === 'string') updatePayload.facebook_url = body.facebook_url;
    if (typeof body.linkedin_handle === 'string') updatePayload.linkedin_handle = body.linkedin_handle;
    if (typeof body.linkedin_url === 'string') updatePayload.linkedin_url = body.linkedin_url;
    if (typeof body.whatsapp_phone === 'string') updatePayload.whatsapp_phone = body.whatsapp_phone;
    if (typeof body.whatsapp_url === 'string') updatePayload.whatsapp_url = body.whatsapp_url;
    // Gallery display fields
    if (typeof body.gallery_title === 'string') updatePayload.gallery_title = body.gallery_title;
    if (typeof body.gallery_subtitle === 'string') updatePayload.gallery_subtitle = body.gallery_subtitle;
    if (typeof body.gallery_title_color === 'string') updatePayload.gallery_title_color = body.gallery_title_color;
    if (typeof body.gallery_subtitle_color === 'string') updatePayload.gallery_subtitle_color = body.gallery_subtitle_color;
    // Headline overlay settings
    if (typeof body.show_headline_overlay === 'boolean') updatePayload.show_headline_overlay = body.show_headline_overlay;
    if (typeof body.cover_headline_position === 'string') updatePayload.cover_headline_position = body.cover_headline_position;
    if (typeof body.headline_text_color === 'string') updatePayload.headline_text_color = body.headline_text_color;
    if (typeof body.cover_headline_font_size !== 'undefined') updatePayload.cover_headline_font_size = Number(body.cover_headline_font_size) || null;
    if (typeof body.cover_headline_offset_x !== 'undefined') updatePayload.cover_headline_offset_x = Number(body.cover_headline_offset_x) || null;
    if (typeof body.cover_headline_offset_y !== 'undefined') updatePayload.cover_headline_offset_y = Number(body.cover_headline_offset_y) || null;
    if (typeof body.cover_headline_z_index !== 'undefined') updatePayload.cover_headline_z_index = Number(body.cover_headline_z_index) || null;
    if (typeof body.cover_headline_wrap !== 'undefined') updatePayload.cover_headline_wrap = !!body.cover_headline_wrap;
    if (typeof body.cover_headline_force_two_lines !== 'undefined') updatePayload.cover_headline_force_two_lines = !!body.cover_headline_force_two_lines;
    // Catalog PDF
    if (typeof body.catalog_pdf_url === 'string') updatePayload.catalog_pdf_url = body.catalog_pdf_url;
    if (typeof body.show_pdf_catalog === 'boolean') updatePayload.show_pdf_catalog = body.show_pdf_catalog;
    if (typeof body.show_pdf_link === 'boolean') updatePayload.show_pdf_link = body.show_pdf_link;
    // Footer colors
    if (typeof body.footer_background_color === 'string') updatePayload.footer_background_color = body.footer_background_color;
    if (typeof body.footer_text_color === 'string') updatePayload.footer_text_color = body.footer_text_color;
    if (typeof body.support_whatsapp === 'string') updatePayload.support_whatsapp = body.support_whatsapp;
    if (typeof body.about_text === 'string') updatePayload.about_text = body.about_text;
    if (typeof body.contact_email === 'string') updatePayload.contact_email = body.contact_email;
    if (typeof body.hide_prices_globally === 'boolean') updatePayload.hide_prices_globally = body.hide_prices_globally;
    if (typeof body.require_customer_approval === 'boolean') updatePayload.require_customer_approval = body.require_customer_approval;
    if (typeof body.block_new_orders === 'boolean') updatePayload.block_new_orders = body.block_new_orders;
    if (typeof body.commission_trigger === 'string') {
      const trigger = String(body.commission_trigger).toLowerCase();
      updatePayload.commission_trigger = trigger === 'faturamento' ? 'faturamento' : 'liquidez';
    }
    if (typeof body.default_commission_rate !== 'undefined') {
      const rate = Number(body.default_commission_rate);
      if (Number.isFinite(rate) && rate >= 0 && rate <= 100) {
        updatePayload.default_commission_rate = rate;
      }
    }

    const payload: Record<string, any> = {
      ...updatePayload,
      updated_at: new Date().toISOString(),
    };

    // Ambientes heterogêneos: remove colunas ausentes de forma incremental.
    for (let attempts = 0; attempts < 8; attempts++) {
      const { data, error } = await supabaseAdmin
        .from('companies')
        .update(payload)
        .eq('id', companyId)
        .select('*')
        .single();

      if (!error) {
        return NextResponse.json({ success: true, data });
      }

      if (!isMissingColumnError(error)) {
        throw error;
      }

      const missingColumn = extractMissingColumnName(error);
      if (!missingColumn || !(missingColumn in payload)) {
        throw error;
      }

      delete payload[missingColumn];
    }

    throw new Error('Falha ao atualizar empresa após remover colunas ausentes');
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}
