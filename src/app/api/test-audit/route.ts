import { NextResponse } from 'next/server';

// Rota de diagnóstico removida — manter arquivo para não quebrar rotas referenciadas.
export async function GET() {
  return NextResponse.json(
    { error: 'diagnostic route removed' },
    { status: 404 }
  );
}
