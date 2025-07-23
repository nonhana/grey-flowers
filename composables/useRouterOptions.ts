import type { HanaScrollView } from '#components'
import type { TemplateRef } from 'vue'

const blackList = ['/recently']

const scrollPositions = new Map<string, number>()

export function useRouterOptions(scrollView: TemplateRef<InstanceType<typeof HanaScrollView>>) {
  const route = useRoute()

  function getCurrentScrollPosition() {
    if (!scrollView.value)
      return 0
    const contentWrapper = scrollView.value.$refs?.contentWrapperElement as HTMLElement
    return contentWrapper?.scrollTop || 0
  }

  function saveScrollPosition(path: string, position: number) {
    scrollPositions.set(path, position)
  }

  function getSavedScrollPosition(path: string) {
    return scrollPositions.get(path) || 0
  }

  function scrollTo(position: number, behavior: 'smooth' | 'instant' = 'smooth') {
    const scrollView = document.getElementById('global-scroll-view')
    if (scrollView) {
      scrollView.scrollTo({
        top: position,
        behavior,
      })
    }
  }

  function scrollToElement(hash: string, maxRetries = 10, currentRetry = 0) {
    const element = document.querySelector(hash)

    if (element) {
      nextTick(() => {
        const rect = element.getBoundingClientRect()
        const containerElement = scrollView.value?.$refs?.containerElement as HTMLElement
        if (containerElement) {
          const containerRect = containerElement.getBoundingClientRect()
          const targetPosition = rect.top - containerRect.top + getCurrentScrollPosition() - 100
          scrollTo(Math.max(0, targetPosition))
        }
      })
    }
    else if (currentRetry < maxRetries) {
      setTimeout(() => {
        scrollToElement(hash, maxRetries, currentRetry + 1)
      }, 100)
    }
  }

  function handleRouteScroll(to: any, from: any) {
    if (from && !blackList.includes(from.path)) {
      const currentPosition = getCurrentScrollPosition()
      saveScrollPosition(from.fullPath, currentPosition)
    }

    nextTick(() => {
      if (to.hash) {
        scrollToElement(to.hash)
        return
      }

      if (to.path === from?.path && to.fullPath === from?.fullPath) {
        scrollTo(0)
        return
      }

      if (blackList.includes(to.path)) {
        return
      }

      const savedPosition = getSavedScrollPosition(to.fullPath)
      scrollTo(savedPosition, 'instant')
    })
  }

  let previousRoute = route

  watch(() => route.fullPath, () => {
    handleRouteScroll(route, previousRoute)
    previousRoute = { ...route }
  })

  onMounted(() => {
    if (route.hash) {
      setTimeout(() => {
        scrollToElement(route.hash)
      }, 300)
    }
    else if (!blackList.includes(route.path)) {
      const savedPosition = getSavedScrollPosition(route.fullPath)
      if (savedPosition > 0) {
        nextTick(() => {
          scrollTo(savedPosition, 'instant')
        })
      }
    }
  })

  onBeforeUnmount(() => {
    if (!blackList.includes(route.path)) {
      const currentPosition = getCurrentScrollPosition()
      saveScrollPosition(route.fullPath, currentPosition)
    }
  })
}
