export function flatStr(str: string): string {
  return str.trim().replace(/\s+/g, '-').toLowerCase()
}

export function antiFlatStr(str: string): string {
  const words = str.split('-')
  return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}
