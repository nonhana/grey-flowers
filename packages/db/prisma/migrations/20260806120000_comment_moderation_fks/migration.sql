-- 去重前置守卫：在加唯一约束前清理同一 (receiverId, commentId) 的存量重复行。
-- 若以下核对有结果（count(*)>1），先执行 DELETE 再继续；否则跳过删除。
SELECT "receiverId", "commentId", count(*) FROM "UserMessage" GROUP BY 1, 2 HAVING count(*) > 1;

-- 保留每组最小 id，删除其余重复（生产数据存在重复时才需要）
-- DELETE FROM "UserMessage" AS a USING "UserMessage" AS b
--   WHERE a."id" > b."id"
--     AND a."receiverId" = b."receiverId"
--     AND a."commentId" = b."commentId";

-- 被回复评论删除后，其余回复降级为无引用（修复兄弟回复指向被删评论时的 P2003）
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_replyToCommentId_fkey";
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_replyToCommentId_fkey" FOREIGN KEY ("replyToCommentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 评论消失，「你被回复了」的消息一并失效（修复删评论引用 UserMessage 的 P2003）
ALTER TABLE "UserMessage" DROP CONSTRAINT "UserMessage_commentId_fkey";
ALTER TABLE "UserMessage" ADD CONSTRAINT "UserMessage_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 同一 (接收者, 回复评论) 至多一条通知（Prisma @@unique 命名规则）
CREATE UNIQUE INDEX "UserMessage_receiverId_commentId_key" ON "UserMessage"("receiverId", "commentId");
