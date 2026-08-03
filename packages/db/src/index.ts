import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../prisma/generated/client.js';

export { Prisma } from '../prisma/generated/client.js';

export type { PrismaClient } from '../prisma/generated/client.js';
export type * from '../prisma/generated/models.js';

export const createPrismaClient = (connectionString: string) => {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
};
