import { createPrismaClient } from '@grey-flowers/db';

import type { ApiEnvironment } from '../env.js';

import { AuthService } from '../modules/auth/service.js';
import { createLogger, type ApiLogger } from './logger.js';

export interface AppDependencies {
  auth: AuthService;
  environment: ApiEnvironment;
  logger: ApiLogger;
  prisma: ReturnType<typeof createPrismaClient>;
}

export function createDependencies(
  environment: ApiEnvironment,
): AppDependencies {
  const prisma = createPrismaClient(environment.HANA_DATABASE_URL);
  const logger = createLogger(environment);

  return {
    environment,
    logger,
    prisma,
    auth: new AuthService(prisma, environment),
  };
}
