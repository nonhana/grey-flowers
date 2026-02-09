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
  title: string
  content?: string
  images?: string[]
  music?: Track[]
  commentCount: number
  publishedAt: string
  editedAt: string
}

export interface IPostActivity {
  title: string
  content: string
  images: string[]
  music: {
    title: string
    src: string
    seconds: number
    albumTitle: string
    albumCover: string
    albumDescription?: string
  }[]
}
