export function useRouteArr() {
  const route = useRoute()
  const { path } = toRefs(route)
  const routeArr = computed(() =>
    path.value
      .split('/')
      .reduce((acc, cur) => {
        if (cur) {
          acc.push(`${acc[acc.length - 1]}/${cur}`)
        }
        else {
          acc.push('')
        }
        return acc
      }, [] as string[])
      .filter(Boolean)
      .map(to => ({ to, title: decodeURI(to.split('/').pop()!) })))

  return routeArr
}
