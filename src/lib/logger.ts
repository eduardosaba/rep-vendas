type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const getTimestamp = () => new Date().toISOString();

const formatMessage = (level: LogLevel, message: string, meta?: any) => {
  const timestamp = getTimestamp();
  const metaString = meta ? JSON.stringify(meta) : '';

  // Em produção, você pode querer enviar isso para um serviço externo (Datadog, Sentry, etc)
  // Por enquanto, formatamos para o console do servidor
  return `[${timestamp}] [${level.toUpperCase()}] ${message} ${metaString}`;
};

export const logger = {
  info: (message: string, meta?: any) => {
    console.log(formatMessage('info', message, meta));
  },

  warn: (message: string, meta?: any) => {
    console.warn(formatMessage('warn', message, meta));
  },

  error: (message: string, error?: any) => {
    console.error(formatMessage('error', message, error));
  },

  debug: (message: string, meta?: any) => {
    // Só exibe debug em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatMessage('debug', message, meta));
    }
  },
};
