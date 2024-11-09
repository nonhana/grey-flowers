type Route = Map<string, {
  title: string
  icon: string
  to: string
}>

export function useRoutesMap() {
  const { t } = useI18n()

  const routesMap: Route = new Map([
    ['/', { title: t('header.routes.home.name'), icon: 'lucide:house', to: '/' }],
    ['/articles', { title: t('header.routes.articles.name'), icon: 'lucide:notebook-pen', to: '/articles' }],
    ['/thoughts', { title: t('header.routes.thoughts.name'), icon: 'lucide:messages-square', to: '/thoughts' }],
    ['/about', { title: t('header.routes.about.name'), icon: 'lucide:info', to: '/about' }],
    ['/friends', { title: t('header.routes.friends.name'), icon: 'lucide:link', to: '/friends' }],
  ])

  const articlesMap: Route = new Map([
    ['/articles', { title: '文章', icon: 'lucide:file-text', to: '/articles' }],
    ['/articles/tags', { title: '标签', icon: 'lucide:tag', to: '/articles/tags' }],
    ['/articles/categories', { title: '目录', icon: 'lucide:folder', to: '/articles/categories' }],
    ['/articles/archives', { title: '归档', icon: 'lucide:archive', to: '/articles/archives' }],
  ])

  return { routesMap, articlesMap }
}
