import { NextResponse } from 'next/server';
import { saveSystemFile } from '@/app/admin/debug/actions';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { path, content } = body;
    if (!path || typeof content !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos' },
        { status: 400 }
      );
    }

    const result = await saveSystemFile(path, content);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
