import type { LucideIcon } from '@lucide/vue'
import { Archive, Clock, FileText, Folder, House, Info, Link, NotebookPen, Tag } from '@lucide/vue'

type Route = Map<string, {
  title: string
  icon: LucideIcon
  to: string
}>

export function useRoutesMap() {
  const routesMap: Route = new Map([
    ['/', { title: '主页', icon: House, to: '/' }],
    ['/articles', { title: '文章', icon: NotebookPen, to: '/articles' }],
    ['/recently', { title: '动态', icon: Clock, to: '/recently' }],
    ['/about', { title: '关于', icon: Info, to: '/about' }],
    ['/links', { title: '一些链接', icon: Link, to: '/links' }],
  ])

  const articlesMap: Route = new Map([
    ['/articles', { title: '文章', icon: FileText, to: '/articles' }],
    ['/articles/tags', { title: '标签', icon: Tag, to: '/articles/tags' }],
    ['/articles/categories', { title: '目录', icon: Folder, to: '/articles/categories' }],
    ['/articles/archives', { title: '归档', icon: Archive, to: '/articles/archives' }],
  ])

  return { routesMap, articlesMap }
}
