type Route = Map<string, {
  title: string
  icon: string
  to: string
}>

export function useRoutesMap() {
  const routesMap: Route = new Map([
    ['/', { title: '主页', icon: 'lucide:house', to: '/' }],
    ['/articles', { title: '文章', icon: 'lucide:notebook-pen', to: '/articles' }],
    // ['/thoughts', { title: '碎碎念', icon: 'lucide:messages-square', to: '/thoughts' }],
    ['/recently', { title: '动态', icon: 'lucide:clock', to: '/recently' }],
    ['/about', { title: '关于', icon: 'lucide:info', to: '/about' }],
    ['/links', { title: '一些链接', icon: 'lucide:link', to: '/links' }],
  ])

  const articlesMap: Route = new Map([
    ['/articles', { title: '文章', icon: 'lucide:file-text', to: '/articles' }],
    ['/articles/tags', { title: '标签', icon: 'lucide:tag', to: '/articles/tags' }],
    ['/articles/categories', { title: '目录', icon: 'lucide:folder', to: '/articles/categories' }],
    ['/articles/archives', { title: '归档', icon: 'lucide:archive', to: '/articles/archives' }],
  ])

  return { routesMap, articlesMap }
}
