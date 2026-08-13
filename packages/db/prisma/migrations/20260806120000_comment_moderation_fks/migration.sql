-- 去重前置守卫：在加唯一约束前清理同一 (receiverId, commentId) 的存量重复行。
-- 保留每组最小 id，删除其余重复（防止生产库已有重复时 CREATE UNIQUE INDEX 中断）。
DELETE FROM "UserMessage" AS a USING "UserMessage" AS b
  WHERE a."id" > b."id"
    AND a."receiverId" = b."receiverId"
    AND a."commentId" = b."commentId";

-- 复核：执行后应无输出（可安全跳过）。
SELECT "receiverId", "commentId", count(*) FROM "UserMessage" GROUP BY 1, 2 HAVING count(*) > 1;

-- 被回复评论删除后，其余回复降级为无引用（修复兄弟回复指向被删评论时的 P2003）
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_replyToCommentId_fkey";
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_replyToCommentId_fkey" FOREIGN KEY ("replyToCommentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 评论消失，「你被回复了」的消息一并失效（修复删评论引用 UserMessage 的 P2003）
ALTER TABLE "UserMessage" DROP CONSTRAINT "UserMessage_commentId_fkey";
ALTER TABLE "UserMessage" ADD CONSTRAINT "UserMessage_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 同一 (接收者, 回复评论) 至多一条通知（Prisma @@unique 命名规则）
CREATE UNIQUE INDEX "UserMessage_receiverId_commentId_key" ON "UserMessage"("receiverId", "commentId");
