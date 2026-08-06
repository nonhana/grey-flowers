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

export interface CommentMarkdownPayload {
  body: MDCParserResult['body'];
  data: MDCParserResult['data'];
  excerpt?: MDCParserResult['excerpt'];
  toc?: MDCParserResult['toc'];
}

export type CommentMarkdownParseRes =
  | { success: true; payload: CommentMarkdownPayload }
  | { success: false; statusCode: number; statusMessage: string };

const commentSchema: typeof defaultSchema = {
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
  clobberPrefix: 'comment-',
};

const getUnsupportedCommentMdTypes = (
  node: MarkdownAstNode,
  found: UnsupportedMdType[] = [],
) => {
  const type = node.type as UnsupportedMdType | undefined;
  if (type && type in UNSUPPORTED_MD_LABELS && !found.includes(type)) {
    found.push(type);
  }

  for (const child of node.children ?? []) {
    getUnsupportedCommentMdTypes(child, found);
  }

  return found;
};

const validateCommentMarkdownAst = () => {
  return (tree: MarkdownAstNode) => {
    const unsupportedTypes = getUnsupportedCommentMdTypes(tree);
    if (!unsupportedTypes.length) return;

    const labels = unsupportedTypes.map((type) => UNSUPPORTED_MD_LABELS[type]);
    throw new Error(`发布失败：评论不支持${labels.join('、')}`, {
      cause: validateCommentMarkdownAst.name,
    });
  };
};

/** 内容长度校验上移到契约 Zod（VALIDATION_FAILED），本函数不再返回 413 分支。 */
export async function parseCommentMarkdown(
  content: string,
): Promise<CommentMarkdownParseRes> {
  try {
    const parsed = await parseMarkdown(content, {
      contentHeading: false,
      toc: false,
      remark: {
        plugins: {
          'remark-mdc': false,
          'comment-markdown-validator': {
            instance: validateCommentMarkdownAst,
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
            options: commentSchema,
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
        excerpt: undefined,
        toc: undefined,
      },
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.cause === validateCommentMarkdownAst.name
    ) {
      return {
        success: false,
        statusCode: 400,
        statusMessage: error.message,
      };
    }

    // eslint-disable-next-line no-console
    console.error('[comment-markdown] parse failed:', error);
    return {
      success: false,
      statusCode: 500,
      statusMessage: '评论 Markdown 解析失败，请稍后重试',
    };
  }
}
