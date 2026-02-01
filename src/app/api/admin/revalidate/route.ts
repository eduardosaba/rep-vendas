import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');

  if (secret !== process.env.REVALIDATE_TOKEN) {
    return NextResponse.json({ message: 'Token Inválido' }, { status: 401 });
  }

  try {
    // Revalide as páginas relevantes. Ajuste caminhos conforme sua rota real.
    try {
      revalidatePath('/dashboard/products');
    } catch (e) {
      /* best-effort */
    }
    try {
      revalidatePath('/catalogo');
    } catch (e) {
      /* best-effort */
    }

    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err) {
    return NextResponse.json({ message: 'Erro ao revalidar' }, { status: 500 });
  }
}
