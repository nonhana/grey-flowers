/** Prisma 唯一约束冲突（P2002）：name/slug/email 等冲突的统一判别。 */
export const isUniqueConstraint = (error: unknown) => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
};
