import { cookies } from 'next/headers';
import { createRouteSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const nextCookies = await cookies();
    const supabase = await createRouteSupabase(() => nextCookies);

    // 1. Verifica se usuário está logado
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // 2. Recebe os dados do formulário. Aceita tanto { body: {...} } quanto o objeto direto.
    const parsed = await request.json().catch(() => null);
    const body = (parsed && typeof parsed === 'object' && 'body' in parsed)
      ? parsed.body
      : parsed || {};

    const { version, title, date, highlights, colorFrom, colorTo, forceShow, publish } = body;

    // 3. Validação Básica
    // - Se for uma requisição apenas para publicar/despublicar (publish definido),
    //   exigimos apenas `version`.
    // - Para criação/upsert completa, exigimos `version` e `title`.
    if (typeof publish !== 'undefined') {
      if (!version) {
        return NextResponse.json({ error: 'Versão é obrigatória' }, { status: 400 });
      }
    } else {
      if (!version || !title) {
        return NextResponse.json(
          { error: 'Versão e Título são obrigatórios' },
          { status: 400 }
        );
      }
    }

    // 4. Se publish foi passado explicitamente, atualiza o registro existente;
    //    caso contrário, faz upsert para criar/ativar a versão.
    if (typeof publish !== 'undefined') {
      const updatePayload: any = { active: !!publish };
      if (typeof forceShow !== 'undefined') updatePayload.force_show = !!forceShow;

      const { error: updateError } = await supabase
        .from('system_updates')
        .update(updatePayload)
        .eq('version', String(version));

      if (updateError) {
        console.error('Erro ao atualizar publish flag:', updateError);
        throw updateError;
      }

      return NextResponse.json({ success: true, message: publish ? 'Versão publicada' : 'Versão despublicada' });
    } else {
      const payload: any = {
        version,
        title,
        date,
        highlights, // O Supabase aceita array de strings direto se a coluna for text[]
        color_from: colorFrom,
        color_to: colorTo,
        active: true,
      };

      if (typeof forceShow !== 'undefined') payload.force_show = !!forceShow;

      const { error: upsertError } = await supabase
        .from('system_updates')
        .upsert(payload, { onConflict: 'version' });

      if (upsertError) {
        console.error('Erro ao upsert update:', upsertError);
        throw upsertError;
      }
      // Garantir que apenas esta versão fique ativa (desativa outras)
      if (payload.active) {
        const { error: deactivateError } = await supabase
          .from('system_updates')
          .update({ active: false })
          .neq('version', String(version))
          .eq('active', true);
        if (deactivateError) {
          console.error('Erro ao desativar outras versões:', deactivateError);
          throw deactivateError;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Versão criada/atualizada com sucesso',
    });
  } catch (error: any) {
    console.error('Erro na API update-version:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
