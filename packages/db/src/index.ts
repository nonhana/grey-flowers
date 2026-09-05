import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../prisma/generated/client';

export { Prisma } from '../prisma/generated/client';

export type { PrismaClient } from '../prisma/generated/client';
export type * from '../prisma/generated/models';

export const createPrismaClient = (connectionString: string) => {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
};
