// useMediaQuery.ts
import { onMounted, onUnmounted } from 'vue'

// 定义 TailwindCSS 的断点
const tailwindBreakpoints = {
  'sm': 640,
  'md': 768,
  'lg': 1024,
  'xl': 1280,
  '2xl': 1536,
}

/**
 * 触发断点事件
 * @param breakpoint - 断点名称，对应 tailwindcss
 * @param callback - 断点事件回调
 */
export function onWatchMedia(breakpoint: keyof typeof tailwindBreakpoints, callback: (inToOut: boolean) => void) {
  if (import.meta.client) {
    let mediaQuery: MediaQueryList
    const handleMediaChange = (event: MediaQueryListEvent | MediaQueryList) => {
      callback(event.matches) // 是否在断点内。从外到内 - false，从内到外 - true
    }
    nextTick().then(() => {
      mediaQuery = window.matchMedia(`(min-width: ${tailwindBreakpoints[breakpoint]}px)`)
      handleMediaChange(mediaQuery)
      mediaQuery.addEventListener('change', handleMediaChange)
    })
    onUnmounted(() => {
      mediaQuery.removeEventListener('change', handleMediaChange)
    })
  }
}
