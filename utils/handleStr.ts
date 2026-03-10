const WHITESPACE_REGEX = /\s+/g

export function flatStr(str: string): string {
  return str.trim().replace(WHITESPACE_REGEX, '-').toLowerCase()
}

export function antiFlatStr(str: string): string {
  const words = str.split('-')
  return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}
