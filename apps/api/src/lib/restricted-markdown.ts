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

export interface RestrictedMarkdownPayload {
  body: MDCParserResult['body'];
  data: MDCParserResult['data'];
  excerpt?: MDCParserResult['excerpt'];
  toc?: MDCParserResult['toc'];
}

export interface RestrictedMarkdownResult {
  statusCode: number;
  statusMessage: string;
}

export interface RestrictedMarkdownOptions {
  /** 消毒后的类名冲突前缀（评论 comment- / 动态 activity-）。 */
  clobberPrefix: string;
  /** 报错文案里的资源名，如「评论」「动态」。 */
  resourceLabel: string;
  /** 是否保留 excerpt/toc（评论丢弃、动态保留）。 */
  keepExcerpt: boolean;
  /** remark 插件键（parseMarkdown 的插件注册名，需逐一唯一）。 */
  validatorKey: string;
}

/** 受限白名单 schema：禁 heading/html/image/table + 精致代码块类名/样式放行。 */
const buildSchema = (clobberPrefix: string): typeof defaultSchema => ({
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
  clobberPrefix,
});

const getUnsupportedMdTypes = (
  node: MarkdownAstNode,
  labels: Record<UnsupportedMdType, string>,
  found: UnsupportedMdType[] = [],
): UnsupportedMdType[] => {
  const type = node.type as UnsupportedMdType | undefined;
  if (type && type in labels && !found.includes(type)) {
    found.push(type);
  }

  for (const child of node.children ?? []) {
    getUnsupportedMdTypes(child, labels, found);
  }

  return found;
};

/**
 * 受限 Markdown 解析工厂（评论/动态共用管道）。
 * 差别只有 clobberPrefix、报错资源名、是否保留 excerpt/toc ——
 * 全部收敛为这里的参数，避免两份 85 行近同实现继续各自漂移。
 */
export const createRestrictedMarkdown = (
  options: RestrictedMarkdownOptions,
) => {
  const schema = buildSchema(options.clobberPrefix);
  const validator = () => {
    return (tree: MarkdownAstNode) => {
      const unsupportedTypes = getUnsupportedMdTypes(
        tree,
        UNSUPPORTED_MD_LABELS,
      );
      if (!unsupportedTypes.length) return;

      const labels = unsupportedTypes.map(
        (type) => UNSUPPORTED_MD_LABELS[type],
      );
      throw new Error(
        `发布失败：${options.resourceLabel}不支持${labels.join('、')}`,
        { cause: options.validatorKey },
      );
    };
  };

  const validatorKey = options.validatorKey;
  const remarkPlugins: Record<
    string,
    false | { instance: () => (tree: MarkdownAstNode) => void }
  > = {
    'remark-mdc': false,
    [validatorKey]: { instance: validator },
  };

  const parse = async (
    content: string,
  ): Promise<
    | { success: true; payload: RestrictedMarkdownPayload | null }
    | { success: false; statusCode: number; statusMessage: string }
  > => {
    try {
      const parsed = await parseMarkdown(content, {
        contentHeading: false,
        toc: false,
        remark: { plugins: remarkPlugins },
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
              options: schema,
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
          ...(options.keepExcerpt
            ? { excerpt: parsed.excerpt, toc: parsed.toc }
            : {}),
        },
      };
    } catch (error) {
      if (error instanceof Error && error.cause === options.validatorKey) {
        return {
          success: false,
          statusCode: 400,
          statusMessage: error.message,
        };
      }

      // eslint-disable-next-line no-console
      console.error(`[restricted-markdown:${options.validatorKey}]`, error);
      return {
        success: false,
        statusCode: 500,
        statusMessage: `${options.resourceLabel} Markdown 解析失败，请稍后重试`,
      };
    }
  };

  return { parse };
};
