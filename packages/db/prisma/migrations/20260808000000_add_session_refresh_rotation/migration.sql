-- refresh 轮换 + 重用检测：会话新增上一轮 refresh hash 字段，用于
-- 1) 每次 refresh 轮换 secret（旧 hash 记入 previous），
-- 2) 收到已轮换前的旧 credential 时判定为重用 → REUSE_DETECTED。
ALTER TABLE "Session" ADD COLUMN "previousRefreshSecretHash" TEXT;
ALTER TYPE "SessionRevokeReason" ADD VALUE 'REUSE_DETECTED';
