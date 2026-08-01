import type { ArticleSearchItem } from '#shared/types/article'
import type { ArticleSearchQuery } from '#shared/types/articles'
import prisma from '#server/utils/prisma'
import { formatDateYmd } from '#shared/utils/date'

const DEFAULT_SEARCH_LIMIT = 8
const MAX_SEARCH_LIMIT = 10
const TITLE_TRIGRAM_THRESHOLD = 0.35

interface SearchRow {
  id: number
  to: string
  title: string
  description: string | null
  content: string | null
  category: string
  tags: string[]
  publishedAt: Date
  score: number | string
}

function normalizeSearchQuery(value: string) {
  return value.replaceAll('"', ' ').trim()
}

function toPlainSearchText(value: string | null | undefined) {
  if (!value) {
    return ''
  }

  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[>*_~#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncateSnippet(value: string, length = 120) {
  if (value.length <= length) {
    return value
  }

  return `${value.slice(0, length).trim()}…`
}

function extractSnippet(value: string, query: string) {
  const plainText = toPlainSearchText(value)
  if (!plainText) {
    return ''
  }

  const loweredText = plainText.toLowerCase()
  const loweredQuery = query.toLowerCase()
  const terms = Array.from(new Set(loweredQuery.split(/\s+/).filter(Boolean))).sort((a, b) => b.length - a.length)

  const phraseIndex = loweredText.indexOf(loweredQuery)
  const matchIndex = phraseIndex >= 0
    ? phraseIndex
    : terms.map(term => loweredText.indexOf(term)).find(index => index >= 0) ?? -1

  if (matchIndex < 0) {
    return truncateSnippet(plainText)
  }

  const start = Math.max(0, matchIndex - 32)
  const end = Math.min(plainText.length, matchIndex + Math.max(loweredQuery.length, 18) + 72)

  let snippet = plainText.slice(start, end).trim()
  if (start > 0) {
    snippet = `…${snippet}`
  }
  if (end < plainText.length) {
    snippet = `${snippet}…`
  }

  return snippet
}

function createSnippet(row: SearchRow, query: string) {
  const description = toPlainSearchText(row.description)
  const content = toPlainSearchText(row.content)
  const loweredQuery = query.toLowerCase()

  if (description && description.toLowerCase().includes(loweredQuery)) {
    return extractSnippet(description, query)
  }

  if (content && content.toLowerCase().includes(loweredQuery)) {
    return extractSnippet(content, query)
  }

  const fallback = description || content
  return fallback ? truncateSnippet(fallback) : '暂无摘要'
}

async function searchArticles(query: string, limit: number) {
  return await prisma.$queryRaw<SearchRow[]>`
    WITH input AS (
      SELECT
        ${query}::text AS raw_query,
        lower(${query}::text) AS lowered_query,
        websearch_to_tsquery('simple', ${query}::text) AS ts_query
    ),
    search_source AS (
      SELECT
        article.id,
        article."to" AS "to",
        article.title,
        article.description,
        article.content,
        article."publishedAt",
        COALESCE(category.name, '未分类') AS category,
        ARRAY(
          SELECT tag.name
          FROM "_ArticleTags" article_tags
          JOIN "Tag" tag ON tag.id = article_tags."B"
          WHERE article_tags."A" = article.id
          ORDER BY tag.name
        ) AS tags,
        (
          setweight(to_tsvector('simple', COALESCE(article.title, '')), 'A')
          || setweight(to_tsvector('simple', COALESCE(article.description, '')), 'B')
          || setweight(to_tsvector('simple', COALESCE(article.content, '')), 'C')
        ) AS document
      FROM "Article" article
      LEFT JOIN "Category" category ON category.id = article."categoryId"
      WHERE article.published = true
    ),
    ranked AS (
      SELECT
        source.*,
        source.document @@ input.ts_query AS text_hit,
        POSITION(input.lowered_query IN lower(source.title)) > 0 AS title_phrase_hit,
        POSITION(input.lowered_query IN lower(COALESCE(source.description, ''))) > 0 AS description_phrase_hit,
        POSITION(input.lowered_query IN lower(COALESCE(source.content, ''))) > 0 AS content_phrase_hit,
        EXISTS (
          SELECT 1
          FROM "_ArticleTags" article_tags
          JOIN "Tag" tag ON tag.id = article_tags."B"
          WHERE article_tags."A" = source.id
            AND (
              POSITION(input.lowered_query IN lower(tag.name)) > 0
              OR similarity(tag.name, input.raw_query) >= 0.2
            )
        ) AS tag_hit,
        (
          POSITION(input.lowered_query IN lower(source.category)) > 0
          OR similarity(source.category, input.raw_query) >= 0.2
        ) AS category_hit,
        source.title % input.raw_query AS title_trigram_hit,
        similarity(source.title, input.raw_query) AS title_similarity,
        ts_rank_cd(source.document, input.ts_query, 32) AS text_rank
      FROM search_source source
      CROSS JOIN input
    ),
    filtered AS (
      SELECT
        *,
        (
          CASE WHEN title_phrase_hit THEN 14 ELSE 0 END
          + CASE WHEN tag_hit THEN 9 ELSE 0 END
          + CASE WHEN category_hit THEN 8 ELSE 0 END
          + CASE WHEN description_phrase_hit THEN 6 ELSE 0 END
          + CASE WHEN content_phrase_hit THEN 5 ELSE 0 END
          + CASE WHEN text_hit THEN text_rank * 10 ELSE 0 END
          + CASE WHEN title_trigram_hit AND title_similarity >= ${TITLE_TRIGRAM_THRESHOLD} THEN title_similarity * 4 ELSE 0 END
        ) AS score
      FROM ranked
      WHERE
        title_phrase_hit
        OR description_phrase_hit
        OR content_phrase_hit
        OR tag_hit
        OR category_hit
        OR text_hit
        OR (title_trigram_hit AND title_similarity >= ${TITLE_TRIGRAM_THRESHOLD})
    )
    SELECT
      id,
      "to",
      title,
      description,
      content,
      category,
      tags,
      "publishedAt",
      score
    FROM filtered
    ORDER BY score DESC, "publishedAt" DESC, id DESC
    LIMIT ${limit}
  `
}

export default formattedEventHandler(async (event) => {
  const searchQuery = getQuery(event) as ArticleSearchQuery
  const normalizedQuery = normalizeSearchQuery(searchQuery.q || '')
  const limit = Math.min(Math.max(Number.parseInt(searchQuery.limit || '', 10) || DEFAULT_SEARCH_LIMIT, 1), MAX_SEARCH_LIMIT)

  if (!normalizedQuery) {
    return { payload: [] as ArticleSearchItem[] }
  }

  const rows = await searchArticles(normalizedQuery, limit)
  const payload: ArticleSearchItem[] = rows.map(row => ({
    to: row.to,
    title: row.title,
    description: row.description?.trim() || '',
    category: row.category,
    tags: row.tags,
    publishedAt: formatDateYmd(row.publishedAt),
    snippet: createSnippet(row, normalizedQuery),
    score: Number(row.score),
  }))

  return { payload }
})
