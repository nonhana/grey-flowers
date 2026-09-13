import type { H3Event } from 'h3'
import type { ZodType } from 'zod'
import { z } from 'zod'

/** 镜像 apps/api lib/parser：契约解析失败 → 400（首个 issue 消息，经 formattedEventHandler 归一为 400 envelope）。 */
export function parsePublicQuery<T>(schema: ZodType<T>, query: unknown): T {
  const parsed = schema.safeParse(query)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? '请求参数不合法',
    })
  }
  return parsed.data
}

export async function parsePublicBody<T>(schema: ZodType<T>, event: H3Event): Promise<T> {
  return parsePublicQuery(schema, await readBody(event))
}

export function parsePositiveIntId(value: unknown): number {
  return parsePublicQuery(z.coerce.number().int().positive(), value)
}
