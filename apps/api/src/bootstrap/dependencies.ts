import { createPrismaClient } from '@grey-flowers/db';

import type { ApiEnvironment } from '../env.js';

export interface AppDependencies {
  prisma: ReturnType<typeof createPrismaClient>;
}

export function createDependencies(
  environment: ApiEnvironment,
): AppDependencies {
  return {
    prisma: createPrismaClient(environment.HANA_DATABASE_URL),
  };
}
