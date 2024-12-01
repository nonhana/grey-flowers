export function getDistance(
  point1: [x: number, y: number],
  point2: [x: number, y: number],
): number {
  const dx = point2[0] - point1[0]
  const dy = point2[1] - point1[1]
  return Math.sqrt(dx * dx + dy * dy)
}
