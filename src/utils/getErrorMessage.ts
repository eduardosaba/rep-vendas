export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return String((error as any).message);
    } catch {
      // fallthrough
    }
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Erro desconhecido';
}
