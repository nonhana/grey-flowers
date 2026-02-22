export interface Track {
  id: number
  title: string
  artist: string
  album: string
  src: string
  seconds: number
  cover: string
}

export interface ActivityItem {
  id: number
  content?: string
  images?: string[]
  music?: Track[]
  commentCount: number
  publishedAt: string
  editedAt: string
}
