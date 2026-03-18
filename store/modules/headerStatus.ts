import { useGlobalScrollStore } from './globalScroll'

export const useHeaderStatusStore = defineStore('headerStatus', () => {
  const route = useRoute()
  const globalScrollStore = useGlobalScrollStore()

  const hidden = ref(false)

  const setHidden = (status: boolean) => {
    hidden.value = status
  }

  // effects
  let lastScrollY = 0
  watch(() => globalScrollStore.scrollTop, (newTop) => {
    if (route.name === 'article-detail') {
      if (newTop > lastScrollY) {
        setHidden(true)
      }
      else {
        setHidden(false)
      }
      lastScrollY = newTop
    }
  })

  return {
    hidden,
    setHidden,
  }
})
