export function useToggleScrollable() {
  const isScrollableDisabled = ref(false)

  const disableScroll = () => {
    if (isScrollableDisabled.value)
      return
    if (hasScrollbar()) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }
    document.body.style.overflow = 'hidden'
    isScrollableDisabled.value = true
  }

  const enableScroll = () => {
    if (!isScrollableDisabled.value)
      return
    document.body.style.paddingRight = ''
    document.body.style.overflow = ''
    isScrollableDisabled.value = false
  }

  const toggleScrollable = (disable: boolean) => {
    if (disable) {
      disableScroll()
    }
    else {
      enableScroll()
    }
  }

  return {
    isScrollableDisabled,
    disableScroll,
    enableScroll,
    toggleScrollable,
  }
}
