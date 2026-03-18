import { useUIInfoStore } from './uiInfo'

export const useHeaderStatusStore = defineStore('headerStatus', () => {
  const route = useRoute()
  const uiInfoStore = useUIInfoStore()

  const hidden = ref(false)

  const setHidden = (status: boolean) => {
    hidden.value = status
  }

  // effects
  let lastScrollY = 0
  watch(() => uiInfoStore.scrollTop, (newTop) => {
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
