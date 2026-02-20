type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const getTimestamp = () => new Date().toISOString();

const formatMessage = (
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>
) => {
  const timestamp = getTimestamp();
  const metaString = meta ? JSON.stringify(meta) : '';

  // Em produção, você pode querer enviar isso para um serviço externo (Datadog, Sentry, etc)
  // Por enquanto, formatamos para o console do servidor
  return `[${timestamp}] [${level.toUpperCase()}] ${message} ${metaString}`;
};

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(formatMessage('info', message, meta));
  },

  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(formatMessage('warn', message, meta));
  },

  error: (message: string, error?: unknown) => {
    console.error(
      formatMessage(
        'error',
        message,
        typeof error === 'object'
          ? (error as Record<string, unknown>)
          : { error: String(error) }
      )
    );
  },

  debug: (message: string, meta?: Record<string, unknown>) => {
    // Só exibe debug em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log(formatMessage('debug', message, meta));
    }
  },
};
