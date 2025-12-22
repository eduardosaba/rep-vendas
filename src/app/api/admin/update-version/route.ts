import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Verifica se usuário está logado
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // 2. Recebe os dados do formulário
    const body = await request.json();
    const { version, title, date, highlights, colorFrom, colorTo } = body;

    // 3. Validação Básica
    if (!version || !title) {
      return NextResponse.json(
        { error: 'Versão e Título são obrigatórios' },
        { status: 400 }
      );
    }

    // 4. Insere/Atualiza no Banco de Dados (upsert para evitar conflict por version)
    const { error: upsertError } = await supabase.from('system_updates').upsert(
      {
        version,
        title,
        date,
        highlights, // O Supabase aceita array de strings direto se a coluna for text[]
        color_from: colorFrom,
        color_to: colorTo,
      },
      { onConflict: 'version' }
    );

    if (upsertError) {
      console.error('Erro ao upsert update:', upsertError);
      throw upsertError;
    }

    return NextResponse.json({
      success: true,
      message: 'Versão publicada com sucesso',
    });
  } catch (error: any) {
    console.error('Erro na API update-version:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
