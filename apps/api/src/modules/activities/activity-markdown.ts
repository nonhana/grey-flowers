import {
  createRestrictedMarkdown,
  type RestrictedMarkdownFailure,
  type RestrictedMarkdownPayload,
} from '@/lib/restricted-markdown.js';

export type ActivityMarkdownPayload = RestrictedMarkdownPayload;

export type ActivityMarkdownParseRes =
  | { success: true; payload: ActivityMarkdownPayload | null }
  | ({ success: false } & RestrictedMarkdownFailure);

const activityMarkdown = createRestrictedMarkdown({
  clobberPrefix: 'activity-',
  resourceLabel: '动态',
  keepExcerpt: true,
  validatorKey: 'activity-markdown-validator',
});

export const shouldSkipActivityMarkdown = (content: string) =>
  content.trim().length === 0;

/** 内容超长由 Zod 前置拦截（VALIDATION_FAILED），本函数不再返回 413。 */
export async function parseActivityMarkdown(
  content: string,
): Promise<ActivityMarkdownParseRes> {
  if (shouldSkipActivityMarkdown(content)) {
    return { success: true, payload: null };
  }

  return activityMarkdown.parse(content);
}
