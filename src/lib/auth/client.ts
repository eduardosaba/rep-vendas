/**
 * @deprecated Use the Server Action `login` at `src/app/login/actions.ts`.
 * This client helper is deprecated because Server Actions ensure cookies
 * are written correctly in Next.js 15 and avoid extra HTTP round-trips.
 */
export async function clientLogin(): Promise<{
  ok: false;
  body: { text: string };
}> {
  console.warn(
    'clientLogin está obsoleto. Use a Server Action `login` em src/app/login/actions.ts'
  );
  return {
    ok: false,
    body: { text: 'Método desativado. Use o formulário de login oficial.' },
  };
}
