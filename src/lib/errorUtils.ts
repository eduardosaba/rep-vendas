export const getErrorMessage = (e: unknown): string => {
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object') {
    const maybeMsg = (e as { message?: unknown }).message;
    if (typeof maybeMsg === 'string') return maybeMsg;
    try {
      return JSON.stringify(maybeMsg) || String(e);
    } catch (_) {
      return String(e);
    }
  }
  return String(e);
};

export const getErrorStack = (e: unknown): string | undefined => {
  if (e && typeof e === 'object') {
    const maybeStack = (e as { stack?: unknown }).stack;
    if (typeof maybeStack === 'string') return maybeStack;
  }
  return undefined;
};
