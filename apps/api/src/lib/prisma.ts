import { Prisma } from '@grey-flowers/db';

/**  Prisma P2002: 唯一约束冲突 */
export const isUniqueConstraint = (error: unknown) => {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
};

/** Prisma P2025: 记录未找到 */
export const isRecordNotFound = (error: unknown) => {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  );
};
