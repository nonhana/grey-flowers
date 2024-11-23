export interface JwtPayload {
  id: number
  email: string
  username: string
  avatar: string | null
  site: string | null
}
