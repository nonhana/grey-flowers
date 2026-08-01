import type { MDCParserResult } from '@nuxtjs/mdc'
import type { MarkdownPagePayload, MarkdownRenderPayload, StaticMarkdownPageSlug } from '#shared/types/markdown'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'
import { parseMarkdown } from '@nuxtjs/mdc/runtime'

const MARKDOWN_TOC_OPTIONS = {
  depth: 2,
  searchDepth: 2,
} as const

const STATIC_MARKDOWN_SOURCES: Record<StaticMarkdownPageSlug, string> = {
  about: 'markdown/about.md',
  friends: 'markdown/friends.md',
}

const staticMarkdownCache = new Map<StaticMarkdownPageSlug, Promise<MarkdownPagePayload>>()

export function isStaticMarkdownPageSlug(value: string | undefined): value is StaticMarkdownPageSlug {
  return value === 'about' || value === 'friends'
}

export async function parseAppMarkdown(content: string) {
  return await parseMarkdown(content, {
    toc: MARKDOWN_TOC_OPTIONS,
  })
}

export function toMarkdownRenderPayload(parsed: MDCParserResult): MarkdownRenderPayload {
  return {
    body: parsed.body,
    data: parsed.data,
    toc: parsed.toc,
    excerpt: parsed.excerpt,
  }
}

export async function getStaticMarkdownPage(slug: StaticMarkdownPageSlug): Promise<MarkdownPagePayload> {
  const cached = staticMarkdownCache.get(slug)
  if (cached) {
    return await cached
  }

  const task = loadStaticMarkdownPage(slug)
  staticMarkdownCache.set(slug, task)

  try {
    return await task
  }
  catch (error) {
    staticMarkdownCache.delete(slug)
    throw error
  }
}

async function loadStaticMarkdownPage(slug: StaticMarkdownPageSlug): Promise<MarkdownPagePayload> {
  const markdownSource = await readStaticMarkdownSource(STATIC_MARKDOWN_SOURCES[slug])
  const parsed = await parseAppMarkdown(markdownSource)

  return {
    id: slug,
    path: `/${slug}`,
    stem: slug,
    ...toMarkdownRenderPayload(parsed),
  }
}

async function readStaticMarkdownSource(relativePath: string) {
  const searchRoots = [
    join(process.cwd(), '.output/public'),
    join(process.cwd(), 'public'),
  ]

  for (const root of searchRoots) {
    try {
      return await readFile(join(root, relativePath), 'utf8')
    }
    catch (error: any) {
      if (error?.code !== 'ENOENT') {
        throw error
      }
    }
  }

  throw createError({
    statusCode: 404,
    statusMessage: `Static markdown asset "${relativePath}" was not found`,
  })
}
