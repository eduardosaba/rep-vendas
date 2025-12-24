import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const headerCookie = request.headers.get('cookie');
    const nextCookies = await cookies();
    const all = nextCookies
      .getAll()
      .map((c: any) => ({
        name: c.name,
        value: c.value,
        options: c.options ?? null,
      }));

    return NextResponse.json({ headerCookie, nextCookies: all });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
