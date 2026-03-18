import { breakpointsTailwind } from '@vueuse/core'

export const useUIInfoStore = defineStore('ui-info', () => {
  const breakpoints = useBreakpoints(breakpointsTailwind)

  const scrollTop = ref(0)
  const scrollHeight = ref(0)
  const clientHeight = ref(0)

  function setScrollTop(val: number) {
    scrollTop.value = val
  }

  function setScrollHeight(val: number) {
    scrollHeight.value = val
  }

  function setClientHeight(val: number) {
    clientHeight.value = val
  }

  return {
    breakpoints,
    scrollTop,
    scrollHeight,
    clientHeight,
    setScrollTop,
    setScrollHeight,
    setClientHeight,
  }
})
