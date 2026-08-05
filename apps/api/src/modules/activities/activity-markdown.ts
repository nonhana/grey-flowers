import type { MDCParserResult } from '@nuxtjs/mdc';

import { parseMarkdown } from '@nuxtjs/mdc/runtime';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

const UNSUPPORTED_MD_LABELS = {
  heading: '标题',
  html: 'HTML',
  image: '图片',
  table: '表格',
} as const;

type UnsupportedMdType = keyof typeof UNSUPPORTED_MD_LABELS;

interface MarkdownAstNode {
  children?: MarkdownAstNode[];
  type?: string;
}

export interface ActivityMarkdownPayload {
  body: MDCParserResult['body'];
  data: MDCParserResult['data'];
  excerpt?: MDCParserResult['excerpt'];
  toc?: MDCParserResult['toc'];
}

export type ActivityMarkdownParseRes =
  | { success: true; payload: ActivityMarkdownPayload | null }
  | { success: false; statusCode: number; statusMessage: string };

const activitySchema: typeof defaultSchema = {
  ...defaultSchema,
  tagNames: [
    'p',
    'br',
    'strong',
    'em',
    'del',
    'a',
    'blockquote',
    'ul',
    'ol',
    'li',
    'code',
    'pre',
    'span',
    'style',
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: [['className'], ['href'], ['target', '_blank', '_self'], ['rel']],
    code: ['__ignoreMap', 'className'],
    pre: [
      'code',
      'language',
      'filename',
      'highlights',
      'meta',
      'className',
      ['style', /^(--shiki-[\w-]+\s*:|background-color\s*:|color\s*:)/i],
      ['tabindex', '0'],
    ],
    span: [
      ['className', /^(line|highlighted|shiki)/],
      ['style', /^(--shiki-[\w-]+\s*:|color\s*:|background-color\s*:)/i],
    ],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto'],
  },
  clobberPrefix: 'activity-',
};

const getUnsupportedActivityMdTypes = (
  node: MarkdownAstNode,
  found: UnsupportedMdType[] = [],
) => {
  const type = node.type as UnsupportedMdType | undefined;
  if (type && type in UNSUPPORTED_MD_LABELS && !found.includes(type)) {
    found.push(type);
  }

  for (const child of node.children ?? []) {
    getUnsupportedActivityMdTypes(child, found);
  }

  return found;
};

const validateActivityMarkdownAst = () => {
  return (tree: MarkdownAstNode) => {
    const unsupportedTypes = getUnsupportedActivityMdTypes(tree);
    if (!unsupportedTypes.length) return;

    const labels = unsupportedTypes.map((type) => UNSUPPORTED_MD_LABELS[type]);
    throw new Error(`发布失败：动态不支持${labels.join('、')}`, {
      cause: validateActivityMarkdownAst.name,
    });
  };
};

export const shouldSkipActivityMarkdown = (content: string) =>
  content.trim().length === 0;

/** 内容超长由 Zod 前置拦截（VALIDATION_FAILED），本函数不再返回 413。 */
export async function parseActivityMarkdown(
  content: string,
): Promise<ActivityMarkdownParseRes> {
  if (shouldSkipActivityMarkdown(content)) {
    return { success: true, payload: null };
  }

  try {
    const parsed = await parseMarkdown(content, {
      contentHeading: false,
      toc: false,
      remark: {
        plugins: {
          'remark-mdc': false,
          'activity-markdown-validator': {
            instance: validateActivityMarkdownAst,
          },
        },
      },
      rehype: {
        options: { allowDangerousHtml: false },
        plugins: {
          'rehype-external-links': {
            options: {
              target: '_blank',
              rel: ['noopener', 'noreferrer', 'nofollow', 'ugc'],
              protocols: ['http', 'https'],
            },
          },
          'rehype-sanitize': {
            instance: rehypeSanitize,
            options: activitySchema,
          },
          'rehype-raw': false,
        },
      },
    });

    return {
      success: true,
      payload: {
        body: parsed.body,
        data: parsed.data,
        excerpt: parsed.excerpt,
        toc: parsed.toc,
      },
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.cause === validateActivityMarkdownAst.name
    ) {
      return {
        success: false,
        statusCode: 400,
        statusMessage: error.message,
      };
    }

    // eslint-disable-next-line no-console
    console.error('[activity-markdown] parse failed:', error);
    return {
      success: false,
      statusCode: 500,
      statusMessage: '动态 Markdown 解析失败，请稍后重试',
    };
  }
}
