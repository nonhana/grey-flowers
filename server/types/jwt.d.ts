export interface JwtPayload {
  id: number
  email: string
  username: string
  avatar: string
  site: string | null
  [key: string]: string | number | null
}
