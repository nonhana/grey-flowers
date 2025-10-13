export interface Track {
  id: number
  title: string
  src: string
  seconds: number
  album: {
    id: number
    title: string
    cover: string
    description?: string
  }
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
