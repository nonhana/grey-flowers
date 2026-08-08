/* oxlint-disable no-console -- CLI 脚本：stdout/stderr 输出即是预期行为 */
import { pathToFileURL } from 'node:url';

/**
 * 本地测试库守卫（seed / prisma:migrate:reset 共用）。
 *
 * `prisma migrate reset --force` 会先整库 DROP 再重放迁移 —— 若 `HANA_DATABASE_URL`
 * 误指到非本机库（staging/CI），守卫必须在这最危险的一步之前拦下，而不是等 seed
 * 里那份延迟到 DROP 之后的检查。hostname 判定与 seed 取自同一实现，避免两份漂移。
 */
export const isLocalDatabaseUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  const hostname = new URL(url).hostname;
  return (
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
  );
};

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const url = process.env.HANA_DATABASE_URL;
  if (!isLocalDatabaseUrl(url)) {
    console.error(
      url
        ? `拒绝在非本机测试库执行重置（目标: ${new URL(url).host}）。该命令会清空全部表，仅允许 localhost/127.0.0.1。`
        : '缺少 HANA_DATABASE_URL 环境变量（从根 .env 读取）。',
    );
    process.exit(1);
  }
  console.log(`本地库守卫通过：目标 ${new URL(url as string).host}`);
}
