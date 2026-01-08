export function isNextRedirect(err: unknown): boolean {
  try {
    if (!err || typeof err !== 'object') return false;
    const anyErr = err as any;
    const digest = anyErr.digest || anyErr.message || anyErr?.toString?.();
    return typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT');
  } catch {
    return false;
  }
}
