import { pino, type Logger } from 'pino';

export type ApiLogger = Logger;

export const createLogger = (environment: {
  NODE_ENV: 'development' | 'production';
}): ApiLogger => {
  if (environment.NODE_ENV === 'development') {
    return pino({
      level: 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
    });
  }

  return pino({
    level: 'info',
  });
};
