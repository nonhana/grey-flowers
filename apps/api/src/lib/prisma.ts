/** Prisma 唯一约束冲突（P2002）：name/slug/email 等冲突的统一判别。 */
export const isUniqueConstraint = (error: unknown) => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
};

/** Prisma 记录未找到（P2025）：乐观锁 where 谓词未命中等「目标行不存在/已变更」的统一判别。 */
export const isRecordNotFound = (error: unknown) => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2025'
  );
};
