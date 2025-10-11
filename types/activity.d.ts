export interface MusicItem {
  title: string
  src: string
  seconds: number
  albumTitle: string
  albumCover: string
  albumDescription?: string
}

export interface ActivityItem {
  id: number
  title: string
  content?: string
  images?: string[]
  music?: MusicItem[]
  commentCount: number
  publishedAt: string
  editedAt: string
}

export interface IPostActivity {
  title: string
  content: string
  images: string[]
  music: MusicItem[]
}
