import type { MarkdownRenderPayload } from '~/types/markdown'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'

const MAX_LENGTH = 2048
const UNSUPPORTED_MD_LABELS = {
  heading: '标题',
  html: 'HTML',
  image: '图片',
  table: '表格',
} as const

type UnsupportedMdType = keyof typeof UNSUPPORTED_MD_LABELS
interface MarkdownAstNode {
  type?: string
  children?: MarkdownAstNode[]
}

export type commentMdParseRes = {
  success: true
  payload: MarkdownRenderPayload
} | {
  success: false
  statusCode: number
  statusMessage: string
}

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
    a: [
      ['className'],
      ['href'],
      ['target', '_blank', '_self'],
      ['rel'],
    ],
    code: [
      '__ignoreMap',
      'className',
    ],
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
}

function getUnsupportedCommentMdTypes(
  node: MarkdownAstNode,
  found: UnsupportedMdType[] = [],
) {
  const type = node.type as UnsupportedMdType | undefined
  if (type && type in UNSUPPORTED_MD_LABELS && !found.includes(type)) {
    found.push(type)
  }

  for (const child of node.children ?? []) {
    getUnsupportedCommentMdTypes(child, found)
  }

  return found
}

function validateCommentMarkdownAst() {
  return (tree: MarkdownAstNode) => {
    const unsupportedTypes = getUnsupportedCommentMdTypes(tree)
    if (!unsupportedTypes.length) {
      return
    }

    const labels = unsupportedTypes.map(type => UNSUPPORTED_MD_LABELS[type])

    throw new Error(`发布失败：评论不支持${labels.join('、')}`, { cause: validateCommentMarkdownAst.name })
  }
}

export async function parseCommentMarkdown(content: string): Promise<commentMdParseRes> {
  if (content.length > MAX_LENGTH) {
    return {
      success: false,
      statusCode: 413,
      statusMessage: `Comment markdown exceeds ${MAX_LENGTH} characters`,
    }
  }

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
    })

    return {
      success: true,
      payload: {
        body: parsed.body,
        data: {},
        excerpt: undefined,
        toc: undefined,
      },
    }
  }
  catch (error) {
    if (error instanceof Error && error.cause === validateCommentMarkdownAst.name) {
      return {
        success: false,
        statusCode: 400,
        statusMessage: error.message,
      }
    }
    console.error('[comment-markdown] parse failed:', error)
    return {
      success: false,
      statusCode: 500,
      statusMessage: '评论 Markdown 解析失败，请稍后重试',
    }
  }
}
