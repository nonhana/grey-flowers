import { createRestrictedMarkdown, type RestrictedMarkdownPayload } from '@/lib/restricted-markdown.js';

export type CommentMarkdownPayload = RestrictedMarkdownPayload;

export type CommentMarkdownParseRes =
  | { success: true; payload: CommentMarkdownPayload }
  | { success: false; statusCode: number; statusMessage: string };

const commentMarkdown = createRestrictedMarkdown({
  clobberPrefix: 'comment-',
  resourceLabel: '评论',
  keepExcerpt: false,
  validatorKey: 'comment-markdown-validator',
});

/** 内容长度校验上移到契约 Zod（VALIDATION_FAILED），本函数不再返回 413 分支。 */
export async function parseCommentMarkdown(
  content: string,
): Promise<CommentMarkdownParseRes> {
  const parsed = await commentMarkdown.parse(content);
  if (!parsed.success) return parsed;

  // 评论正文强制非空内容，工厂不会返回 null payload。
  const { payload } = parsed;
  return { success: true, payload: payload as CommentMarkdownPayload };
}
