import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    const result = await supabase.auth.getUser();

    return Response.json({
      ok: true,
      user: !!result.data.user,
      error: result.error
    });

  } catch (error: any) {
    return Response.json({
      ok: false,
      name: error?.name,
      message: error?.message,
      cause: error?.cause
    });
  }
}
