import { createHash } from 'node:crypto'

export function getAvatarUrl(input: string): string {
  const trimmed = input.trim()
  const lowercased = trimmed.toLowerCase()
  const hash = createHash('sha256').update(lowercased).digest('hex')
  return `https://weavatar.com/avatar/${hash}`
}
