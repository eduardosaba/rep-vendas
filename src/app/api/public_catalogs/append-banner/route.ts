import { NextResponse } from 'next/server';

// Endpoint temporariamente desativado para evitar uso acidental pelo cliente.
// Reverter: restaurar a implementação original que fazia append no array
// `public_catalogs.banners` / `banners_mobile` usando Service Role.
export async function POST(_req: Request) {
  return NextResponse.json(
    { error: 'append-banner disabled: endpoint temporarily turned off' },
    { status: 410 }
  );
}
