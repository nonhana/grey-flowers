import type { HanaScrollView } from '#components'
import type { TemplateRef } from 'vue'

const blackList = ['/recently']

// 用于保存滚动位置的 Map
const scrollPositions = new Map<string, number>()

export function useRouterOptions(scrollView: TemplateRef<InstanceType<typeof HanaScrollView>>) {
  const route = useRoute()

  // 获取当前滚动位置
  function getCurrentScrollPosition() {
    if (!scrollView.value)
      return 0
    const contentWrapper = scrollView.value.$refs?.contentWrapperElement as HTMLElement
    return contentWrapper?.scrollTop || 0
  }

  // 保存当前页面的滚动位置
  function saveScrollPosition(path: string, position: number) {
    scrollPositions.set(path, position)
  }

  // 获取保存的滚动位置
  function getSavedScrollPosition(path: string) {
    return scrollPositions.get(path) || 0
  }

  // 滚动到指定位置
  function scrollTo(position: number, behavior: 'smooth' | 'instant' = 'smooth') {
    if (!scrollView.value)
      return

    if (behavior === 'smooth') {
      scrollView.value.scrollTo(position)
    }
    else {
      // 对于 instant，我们需要直接设置滚动位置
      const contentWrapper = scrollView.value.$refs?.contentWrapperElement as HTMLElement
      if (contentWrapper) {
        contentWrapper.scrollTop = position
      }
    }
  }

  // 滚动到指定元素（处理 hash）
  function scrollToElement(hash: string) {
    nextTick(() => {
      const element = document.querySelector(hash)
      if (element) {
        const rect = element.getBoundingClientRect()
        const containerElement = scrollView.value?.$refs?.containerElement as HTMLElement
        if (containerElement) {
          const containerRect = containerElement.getBoundingClientRect()
          const targetPosition = rect.top - containerRect.top + getCurrentScrollPosition() - 100
          scrollTo(Math.max(0, targetPosition))
        }
      }
    })
  }

  // 处理路由滚动行为
  function handleRouteScroll(to: any, from: any) {
    // 保存当前页面的滚动位置（如果不在黑名单中）
    if (from && !blackList.includes(from.path)) {
      const currentPosition = getCurrentScrollPosition()
      saveScrollPosition(from.fullPath, currentPosition)
    }

    nextTick(() => {
      // 滚动到 hash 位置
      if (to.hash) {
        scrollToElement(to.hash)
        return
      }

      // 如果是同一个页面，滚动到顶部
      if (to.path === from?.path && to.fullPath === from?.fullPath) {
        scrollTo(0)
        return
      }

      // 如果目标页面在黑名单中，不处理滚动
      if (blackList.includes(to.path)) {
        return
      }

      // 恢复保存的滚动位置，或滚动到顶部
      const savedPosition = getSavedScrollPosition(to.fullPath)
      scrollTo(savedPosition, 'instant')
    })
  }

  // 监听路由变化
  let previousRoute = route

  watch(() => route.fullPath, () => {
    handleRouteScroll(route, previousRoute)
    previousRoute = { ...route }
  })

  // 页面刷新时恢复滚动位置
  onMounted(() => {
    if (!blackList.includes(route.path)) {
      const savedPosition = getSavedScrollPosition(route.fullPath)
      if (savedPosition > 0) {
        nextTick(() => {
          scrollTo(savedPosition, 'instant')
        })
      }
    }
  })

  // 页面卸载时保存滚动位置
  onBeforeUnmount(() => {
    if (!blackList.includes(route.path)) {
      const currentPosition = getCurrentScrollPosition()
      saveScrollPosition(route.fullPath, currentPosition)
    }
  })
}
