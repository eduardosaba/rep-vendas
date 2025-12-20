import { NextResponse } from 'next/server';
import { verifySystemFile } from '@/app/admin/debug/actions';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { path } = body;
    if (!path)
      return NextResponse.json(
        { success: false, error: 'Caminho inválido' },
        { status: 400 }
      );

    const result = await verifySystemFile(path);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
