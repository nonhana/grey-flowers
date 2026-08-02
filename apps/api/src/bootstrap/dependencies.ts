import type { PrismaClient } from '@grey-flowers/db';

import { createPrismaClient } from '@grey-flowers/db';

import type { ApiEnvironment } from '../env.js';

import {
  R2ObjectStorage,
  type ObjectStorage,
} from '../adapters/object-storage/r2.js';
import { AssetService } from '../modules/assets/service.js';
import { AuthService } from '../modules/auth/service.js';
import { createLogger, type ApiLogger } from './logger.js';

export interface AppDependencies {
  assets: AssetService;
  auth: AuthService;
  environment: ApiEnvironment;
  logger: ApiLogger;
  objectStorage: ObjectStorage;
  prisma: PrismaClient;
}

export function createDependencies(
  environment: ApiEnvironment,
): AppDependencies {
  const prisma = createPrismaClient(environment.HANA_DATABASE_URL);
  const logger = createLogger(environment);
  const objectStorage = new R2ObjectStorage(environment);

  return {
    environment,
    logger,
    objectStorage,
    prisma,
    assets: new AssetService(prisma, environment, objectStorage),
    auth: new AuthService(prisma, environment),
  };
}
