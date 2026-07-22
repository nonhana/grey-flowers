export function getGlobalScrollWrapper() {
  return document.getElementById('global-scroll-view-wrapper')
}

export function scrollToElementInWrapper(target: HTMLElement | null, offsetTop = 112) {
  const wrapper = getGlobalScrollWrapper()
  if (!wrapper || !target)
    return

  const wrapperRect = wrapper.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const top = targetRect.top - wrapperRect.top + wrapper.scrollTop - offsetTop

  wrapper.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
}
