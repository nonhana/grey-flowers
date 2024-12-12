const specialRoutesHandler = [
  {
    name: 'tagFilter',
    route: '/articles/tags/filter',
    transform: (query: Record<string, any>) => ({
      to: `${query.route}?tag=${query.tag}`,
      title: query.tag || 'Unknown Tag',
    }),
  },
]

export function useRoutesArr() {
  const route = useRoute()
  const { path, query } = toRefs(route)

  const transformSpecialRoute = (to: string, query: Record<string, any>) => {
    const special = specialRoutesHandler.find(r => r.route === to)
    return special ? special.transform({ route: to, ...query }) : null
  }

  const routeArr = computed(() => {
    if (!path.value)
      return []

    const splitPath = path.value
      .split('/')
      .filter(Boolean)
      .reduce((acc, cur) => {
        acc.push(`${acc[acc.length - 1] || ''}/${cur}`)
        return acc
      }, [] as string[])

    return splitPath.map((to) => {
      const specialRoute = transformSpecialRoute(to, query.value)
      if (specialRoute) {
        return specialRoute
      }

      return {
        to,
        title: decodeURIComponent(to.split('/').pop()! || ''),
      }
    })
  })

  return routeArr
}
