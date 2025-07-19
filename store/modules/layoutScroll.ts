export const useLayoutScrollStore = defineStore('layoutScroll', () => {
  const scrollTop = ref(0)

  function setScrollTop(top: number) {
    scrollTop.value = top
  }

  const scrollHeight = ref(0)

  function setScrollHeight(height: number) {
    scrollHeight.value = height
  }

  return {
    scrollTop,
    setScrollTop,
    scrollHeight,
    setScrollHeight,
  }
})
