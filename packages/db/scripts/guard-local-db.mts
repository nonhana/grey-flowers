import { pathToFileURL } from 'node:url';

// 在 reset 执行前判断是否为本地测试库
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
